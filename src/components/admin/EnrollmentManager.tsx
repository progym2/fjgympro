import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, Pause, Play, XCircle, 
  CreditCard, History, Printer, Calendar, 
  Loader2, CheckCircle, Clock, AlertTriangle,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatCurrency, printPaymentReceipt, generateReceiptNumber, printEnrollmentReceipt } from '@/lib/printUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  receipt_number: string | null;
  discount_percentage: number | null;
  installment_number: number;
  total_installments: number;
}

interface AccessLog {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  access_method: string;
}

const EnrollmentManager: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash' as 'cash' | 'pix' | 'card',
    description: '',
    discount: '0',
  });
  
  const [freezeData, setFreezeData] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  });

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, phone, enrollment_status, enrollment_date, freeze_start_date, freeze_end_date, monthly_fee')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
        setPaymentData(prev => ({ ...prev, amount: profileData.monthly_fee?.toString() || '0' }));
      }

      // Load license key
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('license_key')
        .eq('profile_id', userId)
        .maybeSingle();
      
      if (licenseData) setLicenseKey(licenseData.license_key);

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (paymentsData) setPayments(paymentsData as Payment[]);

      // Load access logs
      const { data: accessData } = await supabase
        .from('access_logs')
        .select('*')
        .eq('profile_id', userId)
        .order('check_in_at', { ascending: false })
        .limit(50);
      
      if (accessData) setAccessLogs(accessData as AccessLog[]);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!profile || !paymentData.amount) {
      toast.error('Preencha o valor do pagamento');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    const discount = parseFloat(paymentData.discount) || 0;
    const finalAmount = amount * (1 - discount / 100);
    const receiptNumber = generateReceiptNumber();

    try {
      const { error } = await supabase.from('payments').insert({
        client_id: profile.id,
        amount: finalAmount,
        payment_method: paymentData.method,
        status: 'paid',
        paid_at: new Date().toISOString(),
        description: paymentData.description || 'Mensalidade',
        receipt_number: receiptNumber,
        discount_percentage: discount,
      });

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');
      
      // Print receipt
      printPaymentReceipt({
        clientName: profile.full_name || profile.username,
        amount: finalAmount,
        method: paymentData.method,
        description: paymentData.description || 'Mensalidade',
        receiptNumber,
        discount: discount > 0 ? discount : undefined,
      });

      setShowPaymentDialog(false);
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
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

      toast.success('Matrícula congelada com sucesso!');
      setShowFreezeDialog(false);
      loadData();
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

      toast.success('Matrícula reativada com sucesso!');
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao reativar matrícula');
    }
  };

  const handleCancelEnrollment = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ enrollment_status: 'cancelled' })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Matrícula cancelada');
      setShowCancelDialog(false);
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao cancelar matrícula');
    }
  };

  const handleReactivateEnrollment = async () => {
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

      toast.success('Matrícula reativada!');
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao reativar matrícula');
    }
  };

  const handlePrintEnrollment = () => {
    if (!profile) return;
    
    printEnrollmentReceipt({
      clientName: profile.full_name || profile.username,
      plan: 'Plano Mensal',
      monthlyFee: profile.monthly_fee || 0,
      enrollmentDate: profile.enrollment_date 
        ? format(new Date(profile.enrollment_date), 'dd/MM/yyyy', { locale: ptBR })
        : format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
      licenseKey,
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-green-500/20 text-green-500 border-green-500/50', icon: <CheckCircle size={14} />, label: 'Ativo' },
      frozen: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/50', icon: <Pause size={14} />, label: 'Congelado' },
      cancelled: { color: 'bg-red-500/20 text-red-500 border-red-500/50', icon: <XCircle size={14} />, label: 'Cancelado' },
      pending: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50', icon: <Clock size={14} />, label: 'Pendente' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
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

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate(-1); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          <ArrowLeft size={16} className="inline mr-1" /> Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
          <User className="w-6 h-6" />
          GESTÃO DE MATRÍCULA
        </h2>
      </div>

      {/* Profile Card */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">{profile.full_name || profile.username}</h3>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <div className="mt-2">{getStatusBadge(profile.enrollment_status)}</div>
            {profile.freeze_end_date && profile.enrollment_status === 'frozen' && (
              <p className="text-xs text-blue-400 mt-1">
                Congelado até: {format(new Date(profile.freeze_end_date), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatCurrency(profile.monthly_fee || 0)}</p>
            <p className="text-xs text-muted-foreground">Mensalidade</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <Button 
            onClick={() => { playClickSound(); setShowPaymentDialog(true); }}
            className="bg-green-600 hover:bg-green-700"
          >
            <DollarSign size={16} className="mr-1" /> Registrar Pgto
          </Button>
          
          {profile.enrollment_status === 'active' && (
            <Button 
              onClick={() => { playClickSound(); setShowFreezeDialog(true); }}
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
            >
              <Pause size={16} className="mr-1" /> Congelar
            </Button>
          )}
          
          {profile.enrollment_status === 'frozen' && (
            <Button 
              onClick={() => { playClickSound(); handleUnfreezeEnrollment(); }}
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
            >
              <Play size={16} className="mr-1" /> Descongelar
            </Button>
          )}
          
          {profile.enrollment_status !== 'cancelled' ? (
            <Button 
              onClick={() => { playClickSound(); setShowCancelDialog(true); }}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <XCircle size={16} className="mr-1" /> Cancelar
            </Button>
          ) : (
            <Button 
              onClick={() => { playClickSound(); handleReactivateEnrollment(); }}
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
            >
              <Play size={16} className="mr-1" /> Reativar
            </Button>
          )}
          
          <Button 
            onClick={() => { playClickSound(); handlePrintEnrollment(); }}
            variant="outline"
          >
            <Printer size={16} className="mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard size={16} /> Pagamentos
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <History size={16} /> Acessos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
            ) : (
              <div className="divide-y divide-border/50">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{payment.description || 'Pagamento'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paid_at 
                          ? format(new Date(payment.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'Pendente'
                        }
                      </p>
                      {payment.receipt_number && (
                        <p className="text-xs text-muted-foreground">Recibo: {payment.receipt_number}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${payment.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {formatCurrency(payment.amount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        payment.payment_method === 'cash' ? 'bg-green-500/20 text-green-400' :
                        payment.payment_method === 'pix' ? 'bg-purple-500/20 text-purple-400' :
                        payment.payment_method === 'card' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {payment.payment_method === 'cash' ? 'Dinheiro' :
                         payment.payment_method === 'pix' ? 'PIX' :
                         payment.payment_method === 'card' ? 'Cartão' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            {accessLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum acesso registrado</p>
            ) : (
              <div className="divide-y divide-border/50">
                {accessLogs.map((log) => (
                  <div key={log.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {format(new Date(log.check_in_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entrada: {format(new Date(log.check_in_at), "HH:mm", { locale: ptBR })}
                        {log.check_out_at && ` | Saída: ${format(new Date(log.check_out_at), "HH:mm", { locale: ptBR })}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      log.access_method === 'qrcode' ? 'bg-purple-500/20 text-purple-400' :
                      log.access_method === 'card' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {log.access_method === 'qrcode' ? 'QR Code' :
                       log.access_method === 'card' ? 'Cartão' : 'Manual'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="text-green-500" /> Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Método de Pagamento</label>
              <Select value={paymentData.method} onValueChange={(v: 'cash' | 'pix' | 'card') => setPaymentData({ ...paymentData, method: v })}>
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
            <div>
              <label className="text-sm text-muted-foreground">Desconto (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={paymentData.discount}
                onChange={(e) => setPaymentData({ ...paymentData, discount: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Descrição</label>
              <Input
                placeholder="Ex: Mensalidade Janeiro"
                value={paymentData.description}
                onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                className="bg-background/50"
              />
            </div>
            {parseFloat(paymentData.discount) > 0 && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-sm text-green-400">
                  Valor com desconto: <strong>{formatCurrency(parseFloat(paymentData.amount) * (1 - parseFloat(paymentData.discount) / 100))}</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
            <Button onClick={handleRegisterPayment} className="bg-green-600 hover:bg-green-700">
              <Printer size={16} className="mr-1" /> Registrar e Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze Dialog */}
      <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="text-blue-500" /> Congelar Matrícula
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Data de Início</label>
              <Input
                type="date"
                value={freezeData.startDate}
                onChange={(e) => setFreezeData({ ...freezeData, startDate: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data de Término</label>
              <Input
                type="date"
                value={freezeData.endDate}
                onChange={(e) => setFreezeData({ ...freezeData, endDate: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeDialog(false)}>Cancelar</Button>
            <Button onClick={handleFreezeEnrollment} className="bg-blue-600 hover:bg-blue-700">Congelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle /> Cancelar Matrícula
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja cancelar a matrícula de <strong>{profile.full_name || profile.username}</strong>?
            Esta ação pode ser revertida posteriormente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Voltar</Button>
            <Button onClick={handleCancelEnrollment} variant="destructive">Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default EnrollmentManager;
