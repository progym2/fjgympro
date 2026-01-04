import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, CreditCard, History, Printer, Calendar, 
  Loader2, CheckCircle, Clock, AlertTriangle, DollarSign,
  TrendingUp, TrendingDown, FileText, Phone, Mail, Scale,
  Target, Activity, Eye, Edit2, Banknote, Smartphone, Receipt, Dumbbell, MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { formatCurrency, printPaymentReceipt, generateReceiptNumber, printEnrollmentReceipt } from '@/lib/printUtils';
import { format, differenceInDays, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filterDecimalOnly, filterNumericOnly, preventNonDecimalInput } from '@/lib/inputValidation';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  fitness_level: string | null;
  enrollment_status: string;
  enrollment_date: string | null;
  freeze_start_date: string | null;
  freeze_end_date: string | null;
  monthly_fee: number;
  notes: string | null;
  avatar_url: string | null;
}

interface Payment {
  id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string;
  status: string;
  description: string | null;
  receipt_number: string | null;
  discount_percentage: number | null;
  installment_number: number;
  total_installments: number;
  late_fee: number | null;
  created_at: string;
}

interface AccessLog {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  access_method: string;
}

interface WorkoutLog {
  id: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  workout_plan: {
    name: string;
  } | null;
}

const ClientDetails: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showLatePaymentDialog, setShowLatePaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const [newPaymentData, setNewPaymentData] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'pix' | 'card',
    description: 'Mensalidade',
    discount: '0',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const [latePaymentData, setLatePaymentData] = useState({
    method: 'cash' as 'cash' | 'pix' | 'card',
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    lateFee: '0',
  });

  useEffect(() => {
    if (clientId) loadData();
  }, [clientId]);

  const loadData = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (profileData) {
        setProfile(profileData as unknown as Profile);
        setNewPaymentData(prev => ({ ...prev, amount: profileData.monthly_fee?.toString() || '0' }));
      }

      // Load license key
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('license_key')
        .eq('profile_id', clientId)
        .maybeSingle();
      
      if (licenseData) setLicenseKey(licenseData.license_key);

      // Load ALL payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (paymentsData) setPayments(paymentsData as Payment[]);

      // Load access logs
      const { data: accessData } = await supabase
        .from('access_logs')
        .select('*')
        .eq('profile_id', clientId)
        .order('check_in_at', { ascending: false })
        .limit(100);
      
      if (accessData) setAccessLogs(accessData as AccessLog[]);

      // Load workout logs
      const { data: workoutData } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_plan:workout_plans(name)
        `)
        .eq('profile_id', clientId)
        .order('workout_date', { ascending: false })
        .limit(100);
      
      if (workoutData) setWorkoutLogs(workoutData as unknown as WorkoutLog[]);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const now = new Date();
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const overduePayments = pendingPayments.filter(p => 
      p.due_date && isBefore(new Date(p.due_date), now)
    );
    
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
    
    const onTimePayments = paidPayments.filter(p => {
      if (!p.due_date || !p.paid_at) return true;
      return !isAfter(new Date(p.paid_at), new Date(p.due_date));
    }).length;
    
    const paymentRate = paidPayments.length > 0 
      ? Math.round((onTimePayments / paidPayments.length) * 100) 
      : 100;

    return {
      totalPayments: payments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      totalPaid,
      totalPending,
      totalOverdue,
      paymentRate,
      accessCount: accessLogs.length,
      workoutCount: workoutLogs.length,
    };
  };

  const stats = calculateStats();

  const handleRegisterPayment = async () => {
    if (!profile || !newPaymentData.amount) {
      toast.error('Preencha o valor do pagamento');
      return;
    }

    setProcessingPayment(true);
    try {
      const amount = parseFloat(newPaymentData.amount);
      const discount = parseFloat(newPaymentData.discount) || 0;
      const finalAmount = amount * (1 - discount / 100);
      const receiptNumber = generateReceiptNumber();

      const { error } = await supabase.from('payments').insert({
        client_id: profile.id,
        amount: finalAmount,
        payment_method: newPaymentData.method,
        status: 'paid',
        paid_at: new Date().toISOString(),
        due_date: newPaymentData.dueDate,
        description: newPaymentData.description || 'Mensalidade',
        receipt_number: receiptNumber,
        discount_percentage: discount > 0 ? discount : null,
      });

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');
      
      printPaymentReceipt({
        clientName: profile.full_name || profile.username,
        amount: finalAmount,
        method: newPaymentData.method,
        description: newPaymentData.description || 'Mensalidade',
        receiptNumber,
        discount: discount > 0 ? discount : undefined,
      });

      setShowPaymentDialog(false);
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRegisterLatePayment = async () => {
    if (!selectedPayment || !profile) return;

    setProcessingPayment(true);
    try {
      const lateFee = parseFloat(latePaymentData.lateFee) || 0;
      const finalAmount = selectedPayment.amount + lateFee;

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date(latePaymentData.paidDate).toISOString(),
          payment_method: latePaymentData.method,
          late_fee: lateFee > 0 ? lateFee : null,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      const receiptNumber = generateReceiptNumber();
      toast.success('Pagamento em atraso registrado!');
      
      printPaymentReceipt({
        clientName: profile.full_name || profile.username,
        amount: finalAmount,
        method: latePaymentData.method,
        description: `${selectedPayment.description || 'Mensalidade'} (Atraso)`,
        receiptNumber,
      });

      setShowLatePaymentDialog(false);
      setSelectedPayment(null);
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const openLatePaymentDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setLatePaymentData({
      method: 'cash',
      paidDate: format(new Date(), 'yyyy-MM-dd'),
      lateFee: '0',
    });
    setShowLatePaymentDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-green-500/20 text-green-500 border-green-500/50', icon: <CheckCircle size={14} />, label: 'Ativo' },
      frozen: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/50', icon: <Clock size={14} />, label: 'Congelado' },
      cancelled: { color: 'bg-red-500/20 text-red-500 border-red-500/50', icon: <AlertTriangle size={14} />, label: 'Cancelado' },
      pending: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50', icon: <Clock size={14} />, label: 'Pendente' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (payment: Payment) => {
    if (payment.status === 'paid') {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Pago</Badge>;
    }
    
    if (payment.due_date && isBefore(new Date(payment.due_date), new Date())) {
      const daysLate = differenceInDays(new Date(), new Date(payment.due_date));
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">{daysLate} dias em atraso</Badge>;
    }
    
    return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Pendente</Badge>;
  };

  const getFitnessGoalLabel = (goal: string | null) => {
    const goals: Record<string, string> = {
      muscle_gain: 'Ganho de Massa',
      weight_loss: 'Perda de Peso',
      hypertrophy: 'Hipertrofia',
      conditioning: 'Condicionamento',
      maintenance: 'Manutenção',
    };
    return goals[goal || ''] || 'Não definido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Cliente não encontrado</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate(-1); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <ArrowLeft size={16} className="inline mr-1" /> Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
            <User className="w-6 h-6" />
            DETALHES DO CLIENTE
          </h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/admin/edit-user/${profile.id}`)}
        >
          <Edit2 className="w-4 h-4 mr-1" /> Editar
        </Button>
      </div>

      {/* Profile Header */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-2 border-blue-500/30">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.full_name || profile.username)[0].toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{profile.full_name || profile.username}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(profile.enrollment_status)}
                <Badge variant="outline" className="text-xs">
                  Desde {profile.enrollment_date ? format(new Date(profile.enrollment_date), 'dd/MM/yyyy') : 'N/A'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{formatCurrency(profile.monthly_fee || 0)}</p>
            <p className="text-xs text-muted-foreground">Mensalidade</p>
            <p className="text-xs text-yellow-500 font-mono mt-1">Senha: {licenseKey}</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
          {profile.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{profile.email}</span>
            </div>
          )}
          {profile.cpf && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{profile.cpf}</span>
            </div>
          )}
          {profile.city && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{profile.city}</span>
            </div>
          )}
          {profile.height_cm && (
            <div className="flex items-center gap-2 text-sm">
              <Scale className="w-4 h-4 text-muted-foreground" />
              <span>{profile.height_cm}cm / {profile.weight_kg || '?'}kg</span>
            </div>
          )}
          {profile.fitness_goal && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span>{getFitnessGoalLabel(profile.fitness_goal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pago</p>
                <p className="text-xl font-bebas text-green-500">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-xl font-bebas text-yellow-500">{formatCurrency(stats.totalPending)}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Atraso</p>
                <p className="text-xl font-bebas text-red-500">{formatCurrency(stats.totalOverdue)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pontualidade</p>
                <p className="text-xl font-bebas text-blue-500">{stats.paymentRate}%</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500/50" />
            </div>
            <Progress value={stats.paymentRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Acessos</p>
                <p className="text-xl font-bebas text-purple-500">{stats.accessCount}</p>
              </div>
              <History className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Treinos</p>
                <p className="text-xl font-bebas text-orange-500">{stats.workoutCount}</p>
              </div>
              <Dumbbell className="w-8 h-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button 
          onClick={() => { playClickSound(); setShowPaymentDialog(true); }}
          className="bg-green-600 hover:bg-green-700"
        >
          <DollarSign size={16} className="mr-1" /> Registrar Pagamento
        </Button>
        <Button 
          onClick={() => navigate(`/admin/enrollment/${profile.id}`)}
          variant="outline"
          className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
        >
          <FileText size={16} className="mr-1" /> Gestão Matrícula
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            printEnrollmentReceipt({
              clientName: profile.full_name || profile.username,
              plan: 'Plano Mensal',
              monthlyFee: profile.monthly_fee || 0,
              enrollmentDate: profile.enrollment_date 
                ? format(new Date(profile.enrollment_date), 'dd/MM/yyyy')
                : format(new Date(), 'dd/MM/yyyy'),
              licenseKey,
            });
          }}
        >
          <Printer size={16} className="mr-1" /> Imprimir Ficha
        </Button>
        <Button 
          variant="outline"
          onClick={() => navigate(`/admin/payment-plans?client=${profile.id}`)}
        >
          <Receipt size={16} className="mr-1" /> Criar Carnê
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="payments" className="flex items-center gap-1 text-xs sm:text-sm">
            <CreditCard size={14} /> <span className="hidden sm:inline">Pagamentos</span> ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-1 text-xs sm:text-sm">
            <AlertTriangle size={14} /> <span className="hidden sm:inline">Atraso</span> ({stats.overdueCount})
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-1 text-xs sm:text-sm">
            <Dumbbell size={14} /> <span className="hidden sm:inline">Treinos</span> ({workoutLogs.length})
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-1 text-xs sm:text-sm">
            <History size={14} /> <span className="hidden sm:inline">Acessos</span> ({accessLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
            ) : (
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-muted/10 transition-colors">
                    <div>
                      <p className="font-medium">{payment.description || 'Pagamento'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.due_date && `Vencimento: ${format(new Date(payment.due_date), 'dd/MM/yyyy')}`}
                        {payment.paid_at && ` | Pago em: ${format(new Date(payment.paid_at), 'dd/MM/yyyy')}`}
                      </p>
                      {payment.receipt_number && (
                        <p className="text-xs text-muted-foreground">Recibo: {payment.receipt_number}</p>
                      )}
                      {payment.late_fee && payment.late_fee > 0 && (
                        <p className="text-xs text-red-400">Multa: {formatCurrency(payment.late_fee)}</p>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`font-bold ${payment.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                          {formatCurrency(payment.amount)}
                        </p>
                        {getPaymentStatusBadge(payment)}
                      </div>
                      {payment.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openLatePaymentDialog(payment)}
                          className="text-xs"
                        >
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            {stats.overdueCount === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-green-500 font-medium">Nenhum pagamento em atraso!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {payments.filter(p => p.status === 'pending' && p.due_date && isBefore(new Date(p.due_date), new Date())).map((payment) => {
                  const daysLate = differenceInDays(new Date(), new Date(payment.due_date!));
                  return (
                    <div key={payment.id} className="p-4 flex justify-between items-center bg-red-500/5">
                      <div>
                        <p className="font-medium">{payment.description || 'Mensalidade'}</p>
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {format(new Date(payment.due_date!), 'dd/MM/yyyy')}
                        </p>
                        <Badge className="bg-red-500/20 text-red-500 border-red-500/50 mt-1">
                          {daysLate} dias em atraso
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-red-500">{formatCurrency(payment.amount)}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openLatePaymentDialog(payment)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Registrar Pagamento
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workouts" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            {workoutLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum treino registrado</p>
            ) : (
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {workoutLogs.map((log) => {
                  const duration = log.started_at && log.completed_at
                    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 60000)
                    : null;
                  
                  return (
                    <div key={log.id} className="p-4 flex justify-between items-center hover:bg-muted/10 transition-colors">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-orange-500" />
                          {log.workout_plan?.name || 'Treino Livre'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.workout_date), "dd/MM/yyyy", { locale: ptBR })}
                          {log.started_at && ` | Início: ${format(new Date(log.started_at), "HH:mm")}`}
                          {log.completed_at && ` | Fim: ${format(new Date(log.completed_at), "HH:mm")}`}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {duration && (
                          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/50">
                            {duration} min
                          </Badge>
                        )}
                        {log.completed_at ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/50 ml-2">
                            Concluído
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 ml-2">
                            Em andamento
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            {accessLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum acesso registrado</p>
            ) : (
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {accessLogs.map((log) => (
                  <div key={log.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {format(new Date(log.check_in_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entrada: {format(new Date(log.check_in_at), "HH:mm")}
                        {log.check_out_at && ` | Saída: ${format(new Date(log.check_out_at), "HH:mm")}`}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {log.access_method === 'qrcode' ? 'QR Code' : log.access_method === 'card' ? 'Cartão' : 'Manual'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bebas text-green-500">REGISTRAR PAGAMENTO</DialogTitle>
            <DialogDescription>Registre um novo pagamento para {profile.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Valor (R$)</label>
              <Input
                value={newPaymentData.amount}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, amount: filterDecimalOnly(e.target.value) })}
                onKeyDown={(e) => preventNonDecimalInput(e, newPaymentData.amount)}
                className="bg-background/50 text-lg font-semibold"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Descrição</label>
              <Input
                value={newPaymentData.description}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, description: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Data de Vencimento</label>
              <Input
                type="date"
                value={newPaymentData.dueDate}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, dueDate: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Desconto (%)</label>
              <Input
                value={newPaymentData.discount}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, discount: filterNumericOnly(e.target.value) })}
                className="bg-background/50"
                maxLength={2}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'pix', 'card'] as const).map(method => (
                  <Button
                    key={method}
                    type="button"
                    variant={newPaymentData.method === method ? 'default' : 'outline'}
                    onClick={() => setNewPaymentData({ ...newPaymentData, method })}
                    className={`flex-col h-auto py-3 ${
                      newPaymentData.method === method 
                        ? method === 'cash' ? 'bg-green-600' : method === 'pix' ? 'bg-purple-600' : 'bg-blue-600'
                        : ''
                    }`}
                  >
                    {method === 'cash' && <Banknote className="w-5 h-5 mb-1" />}
                    {method === 'pix' && <Smartphone className="w-5 h-5 mb-1" />}
                    {method === 'card' && <CreditCard className="w-5 h-5 mb-1" />}
                    <span className="text-xs">{method === 'cash' ? 'Dinheiro' : method === 'pix' ? 'PIX' : 'Cartão'}</span>
                  </Button>
                ))}
              </div>
            </div>
            <Button 
              onClick={handleRegisterPayment} 
              disabled={processingPayment}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {processingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Registrar e Imprimir Recibo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Late Payment Dialog */}
      <Dialog open={showLatePaymentDialog} onOpenChange={setShowLatePaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bebas text-red-500">REGISTRAR PAGAMENTO EM ATRASO</DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <>
                  Valor original: {formatCurrency(selectedPayment.amount)}
                  {selectedPayment.due_date && (
                    <> | Vencimento: {format(new Date(selectedPayment.due_date), 'dd/MM/yyyy')}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Data do Pagamento</label>
                <Input
                  type="date"
                  value={latePaymentData.paidDate}
                  onChange={(e) => setLatePaymentData({ ...latePaymentData, paidDate: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Multa por Atraso (R$)</label>
                <Input
                  value={latePaymentData.lateFee}
                  onChange={(e) => setLatePaymentData({ ...latePaymentData, lateFee: filterDecimalOnly(e.target.value) })}
                  onKeyDown={(e) => preventNonDecimalInput(e, latePaymentData.lateFee)}
                  className="bg-background/50"
                />
                {parseFloat(latePaymentData.lateFee) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor total: {formatCurrency(selectedPayment.amount + parseFloat(latePaymentData.lateFee))}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'pix', 'card'] as const).map(method => (
                    <Button
                      key={method}
                      type="button"
                      variant={latePaymentData.method === method ? 'default' : 'outline'}
                      onClick={() => setLatePaymentData({ ...latePaymentData, method })}
                      className={`flex-col h-auto py-3 ${
                        latePaymentData.method === method 
                          ? method === 'cash' ? 'bg-green-600' : method === 'pix' ? 'bg-purple-600' : 'bg-blue-600'
                          : ''
                      }`}
                    >
                      {method === 'cash' && <Banknote className="w-5 h-5 mb-1" />}
                      {method === 'pix' && <Smartphone className="w-5 h-5 mb-1" />}
                      {method === 'card' && <CreditCard className="w-5 h-5 mb-1" />}
                      <span className="text-xs">{method === 'cash' ? 'Dinheiro' : method === 'pix' ? 'PIX' : 'Cartão'}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handleRegisterLatePayment} 
                disabled={processingPayment}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {processingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Registrar Pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ClientDetails;
