import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, CreditCard, Calendar, History, FileText, 
  Loader2, CheckCircle, Clock, AlertTriangle, XCircle,
  Pause, Play, DollarSign, Activity, TrendingUp, Eye,
  Printer, Phone, Mail, Trash2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/printUtils';
import { format, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onEnrollmentChange?: () => void;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  enrollment_status: string;
  enrollment_date: string | null;
  freeze_start_date: string | null;
  freeze_end_date: string | null;
  monthly_fee: number;
}

interface Payment {
  id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string;
  status: string;
  description: string | null;
  installment_number: number;
  total_installments: number;
  plan_id: string | null;
  late_fee: number | null;
  created_at: string;
}

interface PaymentPlan {
  id: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  status: string;
  start_date: string;
  description: string | null;
  created_at: string;
}

interface AccessLog {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  access_method: string;
}

const ClientHistoryDialog: React.FC<ClientHistoryDialogProps> = ({
  open,
  onOpenChange,
  clientId,
  onEnrollmentChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ payments: number; plans: number }>({ payments: 0, plans: 0 });
  const [freezeData, setFreezeData] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  });

  useEffect(() => {
    if (open && clientId) {
      loadData();
    }
  }, [open, clientId]);

  const loadData = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, phone, enrollment_status, enrollment_date, freeze_start_date, freeze_end_date, monthly_fee')
        .eq('id', clientId)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Load ALL payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (paymentsData) {
        // Detect and count duplicates
        const duplicates = detectDuplicatePayments(paymentsData as Payment[]);
        setDuplicateInfo(prev => ({ ...prev, payments: duplicates.length }));
        setPayments(paymentsData as Payment[]);
      }

      // Load payment plans (carnês)
      const { data: plansData } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (plansData) {
        // Detect duplicate plans
        const duplicatePlans = detectDuplicatePlans(plansData as PaymentPlan[]);
        setDuplicateInfo(prev => ({ ...prev, plans: duplicatePlans.length }));
        setPlans(plansData as PaymentPlan[]);
      }

      // Load access logs
      const { data: accessData } = await supabase
        .from('access_logs')
        .select('*')
        .eq('profile_id', clientId)
        .order('check_in_at', { ascending: false })
        .limit(50);
      
      if (accessData) setAccessLogs(accessData as AccessLog[]);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  // Detect duplicate payments (same amount, same plan_id, same installment_number)
  const detectDuplicatePayments = (paymentsList: Payment[]): Payment[] => {
    const seen = new Map<string, Payment>();
    const duplicates: Payment[] = [];

    paymentsList.forEach(payment => {
      const key = `${payment.plan_id}-${payment.installment_number}-${payment.amount}`;
      if (seen.has(key)) {
        duplicates.push(payment);
      } else {
        seen.set(key, payment);
      }
    });

    return duplicates;
  };

  // Detect duplicate plans (same total, same installments, same start_date, created within 5 min)
  const detectDuplicatePlans = (plansList: PaymentPlan[]): PaymentPlan[] => {
    const duplicates: PaymentPlan[] = [];
    
    for (let i = 0; i < plansList.length; i++) {
      for (let j = i + 1; j < plansList.length; j++) {
        const plan1 = plansList[i];
        const plan2 = plansList[j];
        
        if (
          plan1.total_amount === plan2.total_amount &&
          plan1.installments === plan2.installments &&
          plan1.start_date === plan2.start_date
        ) {
          const timeDiff = Math.abs(new Date(plan1.created_at).getTime() - new Date(plan2.created_at).getTime());
          if (timeDiff < 5 * 60 * 1000) { // 5 minutes
            duplicates.push(plan2);
          }
        }
      }
    }

    return duplicates;
  };

  // Remove duplicate entries
  const handleRemoveDuplicates = async () => {
    if (!clientId) return;

    try {
      // Remove duplicate payments
      const duplicatePayments = detectDuplicatePayments(payments);
      if (duplicatePayments.length > 0) {
        const duplicateIds = duplicatePayments.map(p => p.id);
        await supabase.from('payments').delete().in('id', duplicateIds);
      }

      // Remove duplicate plans and their associated payments
      const duplicatePlans = detectDuplicatePlans(plans);
      if (duplicatePlans.length > 0) {
        const duplicatePlanIds = duplicatePlans.map(p => p.id);
        await supabase.from('payments').delete().in('plan_id', duplicatePlanIds);
        await supabase.from('payment_plans').delete().in('id', duplicatePlanIds);
      }

      toast.success(`Removidos: ${duplicatePayments.length} pagamentos e ${duplicatePlans.length} carnês duplicados`);
      loadData();
      onEnrollmentChange?.();
    } catch (err) {
      console.error('Error removing duplicates:', err);
      toast.error('Erro ao remover duplicatas');
    }
  };

  // Delete client (soft delete - preserve history)
  const handleDeleteClient = async () => {
    if (!profile) return;

    setDeleting(true);
    try {
      // Archive client data to deleted_items_trash
      const archivedData = {
        profile: {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          enrollment_date: profile.enrollment_date,
          monthly_fee: profile.monthly_fee,
        },
        payments_summary: {
          total_paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
          total_pending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
          payment_count: payments.length,
        },
        plans_summary: {
          total_plans: plans.length,
          completed_plans: plans.filter(p => p.status === 'completed').length,
        },
        deleted_reason: 'client_deleted_by_admin',
      };

      // Insert into trash
      await supabase.from('deleted_items_trash').insert({
        original_table: 'profiles',
        original_id: profile.id,
        item_data: archivedData,
        deleted_by: profile.id,
      });

      // Mark all pending payments as cancelled (keep history)
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('client_id', profile.id)
        .eq('status', 'pending');

      // Mark all active plans as cancelled
      await supabase
        .from('payment_plans')
        .update({ status: 'cancelled' })
        .eq('client_id', profile.id)
        .eq('status', 'active');

      // Update profile status to cancelled
      await supabase
        .from('profiles')
        .update({ 
          enrollment_status: 'cancelled',
          notes: `Excluído em ${format(new Date(), 'dd/MM/yyyy HH:mm')}. Histórico preservado.`
        })
        .eq('id', profile.id);

      // Deactivate instructor links
      await supabase
        .from('instructor_clients')
        .update({ is_active: false, unlinked_at: new Date().toISOString() })
        .eq('client_id', profile.id)
        .eq('is_active', true);

      toast.success('Cliente excluído! Histórico preservado.');
      setShowDeleteDialog(false);
      onOpenChange(false);
      onEnrollmentChange?.();
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('Erro ao excluir cliente');
    } finally {
      setDeleting(false);
    }
  };

  const handleFreezeEnrollment = async () => {
    if (!profile || !freezeData.endDate) {
      toast.error('Selecione a data de término do congelamento');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          enrollment_status: 'frozen',
          freeze_start_date: freezeData.startDate,
          freeze_end_date: freezeData.endDate,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Freeze all pending payments for this client
      await supabase
        .from('payments')
        .update({ status: 'frozen' })
        .eq('client_id', profile.id)
        .eq('status', 'pending');

      toast.success('Matrícula e pagamentos congelados!');
      setShowFreezeDialog(false);
      loadData();
      onEnrollmentChange?.();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao congelar matrícula');
    }
  };

  const handleUnfreezeEnrollment = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          enrollment_status: 'active',
          freeze_start_date: null,
          freeze_end_date: null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Unfreeze all frozen payments for this client
      await supabase
        .from('payments')
        .update({ status: 'pending' })
        .eq('client_id', profile.id)
        .eq('status', 'frozen');

      toast.success('Matrícula e pagamentos reativados!');
      loadData();
      onEnrollmentChange?.();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao reativar matrícula');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-green-500/20 text-green-500 border-green-500/50', icon: <CheckCircle size={12} />, label: 'Ativo' },
      frozen: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/50', icon: <Pause size={12} />, label: 'Congelado' },
      cancelled: { color: 'bg-red-500/20 text-red-500 border-red-500/50', icon: <XCircle size={12} />, label: 'Cancelado' },
      pending: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50', icon: <Clock size={12} />, label: 'Pendente' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (payment: Payment) => {
    if (payment.status === 'paid') {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Pago</Badge>;
    }
    if (payment.status === 'frozen') {
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">Congelado</Badge>;
    }
    if (payment.status === 'cancelled') {
      return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/50">Cancelado</Badge>;
    }
    if (payment.due_date && isBefore(new Date(payment.due_date), new Date())) {
      const daysLate = differenceInDays(new Date(), new Date(payment.due_date));
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">{daysLate}d atraso</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Pendente</Badge>;
  };

  const getPlanStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-blue-500/20 text-blue-500', label: 'Em Andamento' },
      completed: { color: 'bg-green-500/20 text-green-500', label: 'Quitado' },
      cancelled: { color: 'bg-red-500/20 text-red-500', label: 'Cancelado' },
      frozen: { color: 'bg-purple-500/20 text-purple-500', label: 'Congelado' },
    };
    const badge = badges[status] || badges.active;
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>;
  };

  // Calculate stats
  const stats = {
    totalPaid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount + (p.late_fee || 0), 0),
    totalPending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    overdueCount: payments.filter(p => p.status === 'pending' && p.due_date && isBefore(new Date(p.due_date), new Date())).length,
    totalPlans: plans.length,
    completedPlans: plans.filter(p => p.status === 'completed').length,
    accessCount: accessLogs.length,
  };

  const hasDuplicates = duplicateInfo.payments > 0 || duplicateInfo.plans > 0;

  if (!clientId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="text-blue-500" /> Histórico Completo
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !profile ? (
            <div className="text-center py-8 text-muted-foreground">
              Cliente não encontrado
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-4">
                {/* Duplicate Warning */}
                {hasDuplicates && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        <div>
                          <p className="text-sm font-medium text-yellow-500">Registros Duplicados Detectados</p>
                          <p className="text-xs text-muted-foreground">
                            {duplicateInfo.payments > 0 && `${duplicateInfo.payments} pagamentos`}
                            {duplicateInfo.payments > 0 && duplicateInfo.plans > 0 && ' e '}
                            {duplicateInfo.plans > 0 && `${duplicateInfo.plans} carnês`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                        onClick={handleRemoveDuplicates}
                      >
                        <Trash2 size={14} className="mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                )}

                {/* Profile Header */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{profile.full_name || profile.username}</h3>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(profile.enrollment_status)}
                        {profile.enrollment_date && (
                          <span className="text-xs text-muted-foreground">
                            Desde {format(new Date(profile.enrollment_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                      {profile.freeze_end_date && profile.enrollment_status === 'frozen' && (
                        <p className="text-xs text-blue-400 mt-1">
                          Congelado até: {format(new Date(profile.freeze_end_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{formatCurrency(profile.monthly_fee || 0)}</p>
                      <p className="text-xs text-muted-foreground">Mensalidade</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                    {profile.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate">{profile.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {profile.enrollment_status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                        onClick={() => setShowFreezeDialog(true)}
                      >
                        <Pause size={14} className="mr-1" /> Congelar
                      </Button>
                    )}
                    {profile.enrollment_status === 'frozen' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-500 hover:bg-green-500/10"
                        onClick={handleUnfreezeEnrollment}
                      >
                        <Play size={14} className="mr-1" /> Descongelar
                      </Button>
                    )}
                    {profile.enrollment_status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 size={14} className="mr-1" /> Excluir Cliente
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-500/10 p-3 rounded-lg text-center">
                    <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
                    <p className="text-lg font-bold text-green-500">{formatCurrency(stats.totalPaid)}</p>
                    <p className="text-xs text-muted-foreground">Total Pago</p>
                  </div>
                  <div className="bg-yellow-500/10 p-3 rounded-lg text-center">
                    <Clock className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                    <p className="text-lg font-bold text-yellow-500">{formatCurrency(stats.totalPending)}</p>
                    <p className="text-xs text-muted-foreground">Pendente</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg text-center">
                    <FileText className="w-5 h-5 mx-auto text-primary mb-1" />
                    <p className="text-lg font-bold text-primary">{stats.completedPlans}/{stats.totalPlans}</p>
                    <p className="text-xs text-muted-foreground">Carnês</p>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="payments" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="payments" className="text-xs">
                      <CreditCard size={14} className="mr-1" /> Pagamentos
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="text-xs">
                      <FileText size={14} className="mr-1" /> Carnês
                    </TabsTrigger>
                    <TabsTrigger value="access" className="text-xs">
                      <History size={14} className="mr-1" /> Acessos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="payments" className="mt-3">
                    {payments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Nenhum pagamento</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.slice(0, 20).map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-3 bg-background/50 rounded-lg border border-border">
                            <div>
                              <p className="text-sm font-medium">{p.description || 'Pagamento'}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.plan_id ? `Parcela ${p.installment_number}/${p.total_installments}` : 'Avulso'}
                                {' • '}
                                {p.paid_at 
                                  ? format(new Date(p.paid_at), 'dd/MM/yy')
                                  : p.due_date 
                                    ? `Vence ${format(new Date(p.due_date), 'dd/MM/yy')}`
                                    : 'Sem vencimento'
                                }
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{formatCurrency(p.amount)}</p>
                              {getPaymentStatusBadge(p)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="plans" className="mt-3">
                    {plans.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Nenhum carnê</p>
                    ) : (
                      <div className="space-y-2">
                        {plans.map((plan) => (
                          <div key={plan.id} className="p-3 bg-background/50 rounded-lg border border-border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{plan.description || 'Carnê'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {plan.installments}x de {formatCurrency(plan.installment_amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Início: {format(new Date(plan.start_date), 'dd/MM/yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm text-primary">{formatCurrency(plan.total_amount)}</p>
                                {getPlanStatusBadge(plan.status)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="access" className="mt-3">
                    {accessLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Nenhum acesso</p>
                    ) : (
                      <div className="space-y-2">
                        {accessLogs.slice(0, 20).map((log) => (
                          <div key={log.id} className="flex justify-between items-center p-2 bg-background/50 rounded-lg border border-border">
                            <div>
                              <p className="text-sm font-medium">
                                {format(new Date(log.check_in_at), 'dd/MM/yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Entrada: {format(new Date(log.check_in_at), 'HH:mm')}
                                {log.check_out_at && ` • Saída: ${format(new Date(log.check_out_at), 'HH:mm')}`}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.access_method === 'qrcode' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {log.access_method === 'qrcode' ? 'QR Code' : 'Manual'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Freeze Dialog */}
      <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="text-blue-500" /> Congelar Matrícula
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao congelar, todos os pagamentos pendentes também serão congelados.
            </p>
            <div>
              <label className="text-sm text-muted-foreground">Data Início</label>
              <input
                type="date"
                value={freezeData.startDate}
                onChange={(e) => setFreezeData({ ...freezeData, startDate: e.target.value })}
                className="w-full mt-1 p-2 bg-background border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data Término *</label>
              <input
                type="date"
                value={freezeData.endDate}
                onChange={(e) => setFreezeData({ ...freezeData, endDate: e.target.value })}
                className="w-full mt-1 p-2 bg-background border border-border rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowFreezeDialog(false)}>Cancelar</Button>
            <Button onClick={handleFreezeEnrollment} className="bg-blue-600 hover:bg-blue-700">
              <Pause size={16} className="mr-1" /> Congelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 /> Excluir Cliente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir <strong>{profile?.full_name || profile?.username}</strong>?
              </p>
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">O que será preservado:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Histórico de pagamentos</li>
                  <li>Informações básicas do cliente</li>
                  <li>Registro de carnês e valores</li>
                  <li>Logs de acesso</li>
                </ul>
              </div>
              <p className="text-red-400 text-sm">
                Esta ação cancelará todos os pagamentos pendentes e vínculos com instrutores.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 size={16} className="mr-1" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientHistoryDialog;
