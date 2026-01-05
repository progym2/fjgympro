import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, User, Mail, Phone, Save, Loader2, Award, IdCard, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { filterPhoneOnly, formatCPF, validateCPF, getCPFDigits } from '@/lib/inputValidation';
import { useCpfValidation } from '@/hooks/useCpfValidation';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';

const RegisterInstructor: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile: currentProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    cpf: '',
    city: '',
    email: '',
    phone: '',
    cref: '',
  });

  // Real-time validations
  const cpfValidation = useCpfValidation(formData.cpf);
  const usernameValidation = useUsernameValidation(formData.username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.full_name.trim() || !formData.cref.trim()) {
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          username: formData.username.toLowerCase(),
          full_name: formData.full_name,
          cpf: cpfDigits,
          city: formData.city || null,
          email: formData.email || null,
          phone: formData.phone || null,
          cref: formData.cref,
          created_by_admin: currentProfile?.profile_id || null,
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
        return `INST-${key}`;
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

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Instrutor cadastrado com sucesso!</p>
          <p className="text-sm">Usuário: <strong>{formData.username.toLowerCase()}</strong></p>
          <p className="text-sm">Senha: <strong>{licenseKey}</strong></p>
        </div>,
        { duration: 10000 }
      );
      playClickSound();
      navigate('/admin/list-users');
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(err?.message ? `Erro ao cadastrar instrutor: ${err.message}` : 'Erro ao cadastrar instrutor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate('/admin'); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-green-500 flex items-center gap-2">
          <Dumbbell className="w-6 h-6" />
          CADASTRAR INSTRUTOR
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Usuário *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="instrutor.usuario"
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
              placeholder="NOME DO INSTRUTOR"
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
            <label className="text-sm text-muted-foreground mb-2 block">CREF *</label>
            <div className="relative">
              <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="000000-G/UF"
                value={formData.cref}
                onChange={(e) => setFormData({ ...formData, cref: e.target.value.toUpperCase() })}
                className="pl-10 bg-background/50 uppercase"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Cidade
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="CIDADE DO INSTRUTOR"
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
                placeholder="instrutor@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
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
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/admin')} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default RegisterInstructor;
