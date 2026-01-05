import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, User, Mail, Phone, Calendar, Save, Loader2, 
  CreditCard, Printer, CheckCircle, DollarSign, Banknote, 
  Smartphone, ArrowRight, X, FileText, IdCard, MapPin,
  CheckCircle2, AlertCircle, Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { filterNumericOnly, filterDecimalOnly, filterPhoneOnly, preventNonNumericInput, preventNonDecimalInput, formatCPF, validateCPF, getCPFDigits } from '@/lib/inputValidation';
import { formatCurrency, printPaymentReceipt, printEnrollmentReceipt, generateReceiptNumber } from '@/lib/printUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog';
import { useCpfValidation } from '@/hooks/useCpfValidation';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';

interface EnrollmentResult {
  profileId: string;
  studentId: string;
  username: string;
  fullName: string;
  licenseKey: string;
  monthlyFee: number;
  enrollmentDate: string;
}

const RegisterClient: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile: currentProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCarneDialog, setShowCarneDialog] = useState(false);
  const [carneInstallments, setCarneInstallments] = useState(3);
  const [enrollmentResult, setEnrollmentResult] = useState<EnrollmentResult | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // ESC para voltar ao menu admin (desabilitado quando há dialog aberto)
  useEscapeBack({ to: '/admin', disableWhen: [showPaymentDialog] });
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    cpf: '',
    city: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    fitness_goal: 'maintenance',
    fitness_level: 'beginner',
    monthly_fee: '99.90',
  });

  const [paymentData, setPaymentData] = useState({
    method: '' as '' | 'cash' | 'pix' | 'card',
    amount: '',
    discount: '0',
  });

  // Track unsaved changes
  const hasChanges = formData.username !== '' || formData.full_name !== '';
  const { showExitDialog, confirmExit, handleConfirmExit, handleCancelExit } = useUnsavedChanges({ hasChanges });

  // Real-time validations
  const cpfValidation = useCpfValidation(formData.cpf);
  const usernameValidation = useUsernameValidation(formData.username);

  const handleBack = () => {
    confirmExit(() => navigate('/admin'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.full_name.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Validate username
    if (!usernameValidation.isValid) {
      toast.error(usernameValidation.error || 'Nome de usuário inválido');
      return;
    }
    if (usernameValidation.isDuplicate) {
      toast.error('Este nome de usuário já está em uso');
      return;
    }

    // Validate CPF
    const cpfDigits = getCPFDigits(formData.cpf);
    if (!cpfDigits || cpfDigits.length !== 11) {
      toast.error('CPF inválido - deve ter 11 dígitos');
      return;
    }
    if (!cpfValidation.isValid) {
      toast.error('CPF inválido - verifique os dígitos');
      return;
    }
    if (cpfValidation.isDuplicate) {
      toast.error(`CPF já cadastrado para: ${cpfValidation.duplicateName}`);
      return;
    }

    setSaving(true);
    try {
      // Check for duplicate full_name (case insensitive)
      const { data: existingName } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', formData.full_name.trim())
        .maybeSingle();

      if (existingName) {
        toast.error(`Já existe um cliente cadastrado com este nome: ${existingName.full_name}`);
        setSaving(false);
        return;
      }

      // CPF check already done in real-time validation, just double-check
      const { data: existingCPF } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('cpf', cpfDigits)
        .maybeSingle();

      if (existingCPF) {
        toast.error(`CPF já cadastrado para: ${existingCPF.full_name || 'outro usuário'}`);
        setSaving(false);
        return;
      }

      // Create profile with created_by_admin and monthly_fee
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          username: formData.username.toLowerCase(),
          full_name: formData.full_name,
          cpf: cpfDigits,
          city: formData.city || null,
          email: formData.email || null,
          phone: formData.phone || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          fitness_goal: formData.fitness_goal as any,
          fitness_level: formData.fitness_level,
          created_by_admin: currentProfile?.profile_id || null,
          enrollment_status: 'active',
          enrollment_date: new Date().toISOString().split('T')[0],
          monthly_fee: parseFloat(formData.monthly_fee) || 0,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Generate license key (8 character random)
      const generateKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 8; i++) {
          key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `CLI-${key}`;
      };
      const licenseKey = generateKey();
      
      const { error: licenseError } = await supabase
        .from('licenses')
        .insert({
          profile_id: profile.id,
          license_key: licenseKey,
          license_type: 'full',
          status: 'active',
        });

      if (licenseError) throw licenseError;

      // Store enrollment result and show payment dialog
      setEnrollmentResult({
        profileId: profile.id,
        studentId: profile.student_id || 'N/A',
        username: formData.username.toLowerCase(),
        fullName: formData.full_name,
        licenseKey,
        monthlyFee: parseFloat(formData.monthly_fee) || 0,
        enrollmentDate: format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
      });
      setPaymentData(prev => ({ ...prev, amount: formData.monthly_fee }));
      setShowPaymentDialog(true);
      playClickSound();
      
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(err?.message ? `Erro ao cadastrar cliente: ${err.message}` : 'Erro ao cadastrar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (method: 'cash' | 'pix' | 'card') => {
    if (!enrollmentResult || processingPayment) return;
    
    // Check if payment already registered to prevent duplicates
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('client_id', enrollmentResult.profileId)
      .eq('description', 'Primeira mensalidade')
      .maybeSingle();
    
    if (existingPayment) {
      toast.info('Pagamento já foi registrado!');
      return;
    }
    
    setProcessingPayment(true);
    setPaymentData(prev => ({ ...prev, method }));

    try {
      const amount = parseFloat(paymentData.amount);
      const discount = parseFloat(paymentData.discount) || 0;
      const finalAmount = amount * (1 - discount / 100);
      const receiptNumber = generateReceiptNumber();

      // Register payment
      const { error } = await supabase.from('payments').insert({
        client_id: enrollmentResult.profileId,
        amount: finalAmount,
        payment_method: method,
        status: 'paid',
        paid_at: new Date().toISOString(),
        description: 'Primeira mensalidade',
        receipt_number: receiptNumber,
        discount_percentage: discount > 0 ? discount : null,
        due_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');
      
      // Print payment receipt
      printPaymentReceipt({
        clientName: enrollmentResult.fullName,
        amount: finalAmount,
        method,
        description: 'Primeira mensalidade',
        receiptNumber,
        discount: discount > 0 ? discount : undefined,
      });

      setPaymentData(prev => ({ ...prev, method }));
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrintEnrollment = () => {
    if (!enrollmentResult) return;
    
    printEnrollmentReceipt({
      clientName: enrollmentResult.fullName,
      plan: 'Plano Mensal',
      monthlyFee: enrollmentResult.monthlyFee,
      enrollmentDate: enrollmentResult.enrollmentDate,
      licenseKey: enrollmentResult.licenseKey,
    });
  };

  const handleFinish = () => {
    setShowPaymentDialog(false);
    toast.success(
      <div className="space-y-1">
        <p className="font-semibold">Cliente cadastrado com sucesso!</p>
        <p className="text-sm">ID: <strong>{enrollmentResult?.studentId}</strong></p>
        <p className="text-sm">Usuário: <strong>{enrollmentResult?.username}</strong></p>
        <p className="text-sm">Senha: <strong>{enrollmentResult?.licenseKey}</strong></p>
      </div>,
      { duration: 10000 }
    );
    navigate('/admin/list-users');
  };

  const handleSkipPayment = () => {
    toast.info('Matrícula finalizada sem pagamento');
    handleFinish();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); handleBack(); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          CADASTRAR CLIENTE
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Usuário *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="nome.usuario"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                className={`pl-10 pr-10 bg-background/50 ${usernameValidation.error ? 'border-destructive' : usernameValidation.isValid && formData.username.trim().length >= 3 && !usernameValidation.isDuplicate ? 'border-green-500' : ''}`}
              />
              {usernameValidation.isChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
              {!usernameValidation.isChecking && usernameValidation.isValid && formData.username.trim().length >= 3 && !usernameValidation.isDuplicate && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {!usernameValidation.isChecking && (usernameValidation.isDuplicate || !usernameValidation.isValid) && formData.username.trim().length >= 3 && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {usernameValidation.error && <p className="text-xs text-destructive mt-1">{usernameValidation.error}</p>}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Nome Completo *</label>
            <Input
              placeholder="NOME DO CLIENTE"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value.toUpperCase() })}
              className="bg-background/50 uppercase"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
              <IdCard className="w-3 h-3" />
              CPF *
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className={`pl-10 pr-10 bg-background/50 ${cpfValidation.error ? 'border-destructive' : cpfValidation.isValid && getCPFDigits(formData.cpf).length === 11 && !cpfValidation.isDuplicate ? 'border-green-500' : ''}`}
                maxLength={14}
              />
              {cpfValidation.isChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
              {!cpfValidation.isChecking && cpfValidation.isValid && getCPFDigits(formData.cpf).length === 11 && !cpfValidation.isDuplicate && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {!cpfValidation.isChecking && (cpfValidation.isDuplicate || !cpfValidation.isValid) && getCPFDigits(formData.cpf).length === 11 && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {cpfValidation.error && <p className="text-xs text-destructive mt-1">{cpfValidation.error}</p>}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Cidade
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="CIDADE DO CLIENTE"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value.toUpperCase() })}
                className="pl-10 bg-background/50 uppercase"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: filterPhoneOnly(e.target.value) })}
                className="pl-10 bg-background/50"
                inputMode="tel"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Data de Nascimento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Gênero</label>
            <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Altura (cm)</label>
            <Input
              placeholder="170"
              value={formData.height_cm}
              onChange={(e) => setFormData({ ...formData, height_cm: filterNumericOnly(e.target.value) })}
              onKeyDown={preventNonNumericInput}
              className="bg-background/50"
              inputMode="numeric"
              maxLength={3}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Peso (kg)</label>
            <Input
              placeholder="70.5"
              value={formData.weight_kg}
              onChange={(e) => setFormData({ ...formData, weight_kg: filterDecimalOnly(e.target.value) })}
              onKeyDown={(e) => preventNonDecimalInput(e, formData.weight_kg)}
              className="bg-background/50"
              inputMode="decimal"
              maxLength={6}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Objetivo</label>
            <Select value={formData.fitness_goal} onValueChange={(v) => setFormData({ ...formData, fitness_goal: v })}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="muscle_gain">Ganho de Massa</SelectItem>
                <SelectItem value="weight_loss">Perda de Peso</SelectItem>
                <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                <SelectItem value="conditioning">Condicionamento</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Nível</label>
            <Select value={formData.fitness_level} onValueChange={(v) => setFormData({ ...formData, fitness_level: v })}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Iniciante</SelectItem>
                <SelectItem value="intermediate">Intermediário</SelectItem>
                <SelectItem value="advanced">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Monthly Fee Field */}
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Valor da Mensalidade (R$)
            </label>
            <Input
              placeholder="99.90"
              value={formData.monthly_fee}
              onChange={(e) => setFormData({ ...formData, monthly_fee: filterDecimalOnly(e.target.value) })}
              onKeyDown={(e) => preventNonDecimalInput(e, formData.monthly_fee)}
              className="bg-background/50 text-lg font-semibold"
              inputMode="decimal"
              maxLength={10}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </form>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showExitDialog}
        onOpenChange={handleCancelExit}
        onConfirmExit={handleConfirmExit}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bebas text-green-500 text-2xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              MATRÍCULA REALIZADA!
            </DialogTitle>
            <DialogDescription>
              Cliente cadastrado com sucesso. Escolha uma opção para finalizar:
            </DialogDescription>
          </DialogHeader>

          {enrollmentResult && (
            <div className="space-y-4">
              {/* Client Info Summary */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ID do Aluno:</span>
                  <span className="font-mono text-primary font-bold text-lg">{enrollmentResult.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{enrollmentResult.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Usuário:</span>
                  <span className="font-mono">@{enrollmentResult.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Senha:</span>
                  <span className="font-mono text-yellow-500">{enrollmentResult.licenseKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mensalidade:</span>
                  <span className="font-bold text-green-500">{formatCurrency(enrollmentResult.monthlyFee)}</span>
                </div>
              </div>

              {/* Discount Field */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Desconto Promocional (%)</label>
                <Input
                  placeholder="0"
                  value={paymentData.discount}
                  onChange={(e) => setPaymentData({ ...paymentData, discount: filterNumericOnly(e.target.value) })}
                  className="bg-background/50"
                  inputMode="numeric"
                  maxLength={2}
                />
                {parseFloat(paymentData.discount) > 0 && (
                  <p className="text-xs text-green-500 mt-1">
                    Valor com desconto: {formatCurrency(enrollmentResult.monthlyFee * (1 - parseFloat(paymentData.discount) / 100))}
                  </p>
                )}
              </div>

              {/* Payment Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Registrar Pagamento:</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => handlePayment('cash')}
                    disabled={processingPayment}
                    className={`flex-col h-auto py-3 ${paymentData.method === 'cash' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600/80 hover:bg-green-600'}`}
                  >
                    <Banknote className="w-5 h-5 mb-1" />
                    <span className="text-xs">Dinheiro</span>
                  </Button>
                  <Button
                    onClick={() => handlePayment('pix')}
                    disabled={processingPayment}
                    className={`flex-col h-auto py-3 ${paymentData.method === 'pix' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600/80 hover:bg-purple-600'}`}
                  >
                    <Smartphone className="w-5 h-5 mb-1" />
                    <span className="text-xs">PIX</span>
                  </Button>
                  <Button
                    onClick={() => handlePayment('card')}
                    disabled={processingPayment}
                    className={`flex-col h-auto py-3 ${paymentData.method === 'card' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/80 hover:bg-blue-600'}`}
                  >
                    <CreditCard className="w-5 h-5 mb-1" />
                    <span className="text-xs">Cartão</span>
                  </Button>
                </div>
                {paymentData.method && (
                  <p className="text-xs text-green-500 text-center mt-2">
                    ✓ Pagamento em {paymentData.method === 'cash' ? 'Dinheiro' : paymentData.method === 'pix' ? 'PIX' : 'Cartão'} registrado!
                  </p>
                )}
              </div>

              {/* Boleto/Invoice Generation */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Gerar Documentos:</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!enrollmentResult) return;
                      const vencimento = new Date();
                      vencimento.setDate(vencimento.getDate() + 30);
                      const valor = parseFloat(paymentData.discount) > 0 
                        ? enrollmentResult.monthlyFee * (1 - parseFloat(paymentData.discount) / 100)
                        : enrollmentResult.monthlyFee;
                      
                      const boletoContent = `
=======================================
           BOLETO DE COBRANÇA
=======================================

Cliente: ${enrollmentResult.fullName}
ID: ${enrollmentResult.studentId}
Usuário: @${enrollmentResult.username}

Valor: ${formatCurrency(valor)}
Vencimento: ${format(vencimento, 'dd/MM/yyyy', { locale: ptBR })}

Descrição: Mensalidade Academia
Referência: ${enrollmentResult.licenseKey}

=======================================
           INSTRUÇÕES
=======================================
Pagamento via PIX, transferência 
bancária ou dinheiro na recepção.

Data de emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
=======================================
                      `;
                      
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Boleto - ${enrollmentResult.fullName}</title>
                              <style>
                                body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
                                @media print { body { margin: 0; } }
                              </style>
                            </head>
                            <body>${boletoContent}</body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                      toast.success('Boleto gerado!');
                    }}
                    className="flex flex-col items-center gap-1 h-auto py-3 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Boleto</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCarneDialog(true)}
                    className="flex flex-col items-center gap-1 h-auto py-3 border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
                  >
                    <Receipt className="w-4 h-4" />
                    <span className="text-xs">Carnê</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintEnrollment}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="text-xs">Matrícula</span>
                  </Button>
                </div>
              </div>

              {/* Finish Button */}
              <Button
                onClick={handleFinish}
                className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                Finalizar Cadastro
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                onClick={handleSkipPayment}
                className="w-full text-muted-foreground text-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Fechar sem registrar pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Carnê Dialog */}
      <Dialog open={showCarneDialog} onOpenChange={setShowCarneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bebas text-purple-500 text-2xl flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              GERAR CARNÊ DE PAGAMENTO
            </DialogTitle>
            <DialogDescription>
              Gere um carnê com várias parcelas para o cliente
            </DialogDescription>
          </DialogHeader>

          {enrollmentResult && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{enrollmentResult.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <span className="font-mono text-primary">{enrollmentResult.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mensalidade:</span>
                  <span className="font-bold text-green-500">{formatCurrency(enrollmentResult.monthlyFee)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Número de Parcelas</label>
                <div className="flex gap-2">
                  {[3, 6, 12].map((num) => (
                    <Button
                      key={num}
                      variant={carneInstallments === num ? "default" : "outline"}
                      onClick={() => setCarneInstallments(num)}
                      className={`flex-1 ${carneInstallments === num ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    >
                      {num}x
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Total: {formatCurrency(enrollmentResult.monthlyFee * carneInstallments)}
                </p>
              </div>

              <Button
                onClick={() => {
                  if (!enrollmentResult) return;
                  
                  let carneContent = `
===============================================
                CARNÊ DE PAGAMENTO
===============================================

Cliente: ${enrollmentResult.fullName}
ID: ${enrollmentResult.studentId}
Usuário: @${enrollmentResult.username}

Valor por Parcela: ${formatCurrency(enrollmentResult.monthlyFee)}
Total de Parcelas: ${carneInstallments}
Valor Total: ${formatCurrency(enrollmentResult.monthlyFee * carneInstallments)}

Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}

===============================================
                  PARCELAS
===============================================
`;
                  
                  for (let i = 1; i <= carneInstallments; i++) {
                    const vencimento = new Date();
                    vencimento.setMonth(vencimento.getMonth() + i);
                    
                    carneContent += `
┌─────────────────────────────────────────────┐
│  PARCELA ${String(i).padStart(2, '0')}/${String(carneInstallments).padStart(2, '0')}                              │
│                                             │
│  Cliente: ${enrollmentResult.fullName.substring(0, 30).padEnd(30)}│
│  ID: ${enrollmentResult.studentId.padEnd(35)}│
│  Valor: ${formatCurrency(enrollmentResult.monthlyFee).padEnd(32)}│
│  Vencimento: ${format(vencimento, 'dd/MM/yyyy', { locale: ptBR }).padEnd(28)}│
│                                             │
│  ☐ PAGO    Data: ___/___/____              │
└─────────────────────────────────────────────┘
`;
                  }

                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Carnê - ${enrollmentResult.fullName}</title>
                          <style>
                            body { font-family: monospace; white-space: pre-wrap; padding: 20px; font-size: 12px; }
                            @media print { body { margin: 0; } }
                          </style>
                        </head>
                        <body>${carneContent}</body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                  toast.success(`Carnê de ${carneInstallments} parcelas gerado!`);
                  setShowCarneDialog(false);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Gerar e Imprimir Carnê
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowCarneDialog(false)}
                className="w-full text-muted-foreground text-sm"
              >
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default RegisterClient;
