import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, User, Dumbbell, Mail, Phone, Calendar, Ruler, Weight, Target, Activity, Key, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { filterNumericOnly, filterDecimalOnly, filterPhoneOnly, preventNonNumericInput, preventNonDecimalInput } from '@/lib/inputValidation';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog';

type FitnessGoal = Database['public']['Enums']['fitness_goal'];

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cref: string | null;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: FitnessGoal | null;
  fitness_level: string | null;
  notes: string | null;
}

const EditUser: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { playClickSound } = useAudio();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [currentLicenseKey, setCurrentLicenseKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [originalData, setOriginalData] = useState<typeof formData | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    cref: '',
    birth_date: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    fitness_goal: '' as FitnessGoal | '',
    fitness_level: '',
    notes: '',
  });

  const isInstructor = !!user?.cref;

  // Track unsaved changes
  const hasChanges = useMemo(() => {
    if (!originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  const { showExitDialog, confirmExit, handleConfirmExit, handleCancelExit } = useUnsavedChanges({ hasChanges });

  const handleBack = () => {
    confirmExit(() => navigate('/admin/list-users'));
  };

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Usuário não encontrado');
        navigate('/admin/list-users');
        return;
      }

      // Load current license key
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('license_key')
        .eq('profile_id', userId)
        .maybeSingle();
      
      setCurrentLicenseKey(licenseData?.license_key || null);

      setUser(data);
      const loadedData = {
        username: data.username || '',
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        cref: data.cref || '',
        birth_date: data.birth_date || '',
        gender: data.gender || '',
        height_cm: data.height_cm?.toString() || '',
        weight_kg: data.weight_kg?.toString() || '',
        fitness_goal: data.fitness_goal || '' as FitnessGoal | '',
        fitness_level: data.fitness_level || '',
        notes: data.notes || '',
      };
      setFormData(loadedData);
      setOriginalData(loadedData);
    } catch (err: any) {
      console.error('Error loading user:', err);
      toast.error(`Erro ao carregar usuário: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateNewPassword = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    return `${year}${random}`;
  };

  const handleResetPassword = async () => {
    setResettingPassword(true);
    try {
      const newKey = generateNewPassword();
      
      const { error } = await supabase
        .from('licenses')
        .update({ license_key: newKey })
        .eq('profile_id', userId);

      if (error) throw error;

      setNewPassword(newKey);
      setCurrentLicenseKey(newKey);
      toast.success('Senha resetada com sucesso!');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      toast.error(`Erro ao resetar senha: ${err.message}`);
    } finally {
      setResettingPassword(false);
      setShowResetDialog(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (!formData.username.trim()) {
      toast.error('Username é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // Check if username is taken by another user
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username.trim())
        .neq('id', userId)
        .maybeSingle();

      if (existingUser) {
        toast.error('Este username já está em uso');
        setSaving(false);
        return;
      }

      const updateData: any = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
      };

      if (isInstructor) {
        updateData.cref = formData.cref.trim() || null;
      } else {
        updateData.birth_date = formData.birth_date || null;
        updateData.gender = formData.gender || null;
        updateData.height_cm = formData.height_cm ? parseFloat(formData.height_cm) : null;
        updateData.weight_kg = formData.weight_kg ? parseFloat(formData.weight_kg) : null;
        updateData.fitness_goal = formData.fitness_goal || null;
        updateData.fitness_level = formData.fitness_level || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuário atualizado com sucesso!');
      navigate('/admin/list-users');
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast.error(`Erro ao atualizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { playClickSound(); handleBack(); }}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isInstructor ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
            {isInstructor ? (
              <Dumbbell className="w-6 h-6 text-green-500" />
            ) : (
              <User className="w-6 h-6 text-blue-500" />
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bebas text-purple-500">
              EDITAR {isInstructor ? 'INSTRUTOR' : 'CLIENTE'}
            </h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-bebas text-lg text-blue-500 flex items-center gap-2">
            <User className="w-5 h-5" />
            INFORMAÇÕES BÁSICAS
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="nome_usuario"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="Nome completo"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', filterPhoneOnly(e.target.value))}
                placeholder="(00) 00000-0000"
                className="bg-background/50"
                inputMode="tel"
              />
            </div>
          </div>

          {isInstructor && (
            <div className="space-y-2">
              <Label htmlFor="cref" className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                CREF
              </Label>
              <Input
                id="cref"
                value={formData.cref}
                onChange={(e) => handleChange('cref', e.target.value)}
                placeholder="000000-G/XX"
                className="bg-background/50"
              />
            </div>
          )}
        </div>

        {/* Client-specific fields */}
        {!isInstructor && (
          <>
            <div className="space-y-4">
              <h3 className="font-bebas text-lg text-green-500 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                DADOS PESSOAIS
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
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
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bebas text-lg text-amber-500 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                MEDIDAS
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height_cm" className="flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Altura (cm)
                  </Label>
                  <Input
                    id="height_cm"
                    value={formData.height_cm}
                    onChange={(e) => handleChange('height_cm', filterNumericOnly(e.target.value))}
                    onKeyDown={preventNonNumericInput}
                    placeholder="175"
                    className="bg-background/50"
                    inputMode="numeric"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_kg" className="flex items-center gap-2">
                    <Weight className="w-4 h-4" />
                    Peso (kg)
                  </Label>
                  <Input
                    id="weight_kg"
                    value={formData.weight_kg}
                    onChange={(e) => handleChange('weight_kg', filterDecimalOnly(e.target.value))}
                    onKeyDown={(e) => preventNonDecimalInput(e, formData.weight_kg)}
                    placeholder="70.5"
                    className="bg-background/50"
                    inputMode="decimal"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bebas text-lg text-purple-500 flex items-center gap-2">
                <Target className="w-5 h-5" />
                OBJETIVO E NÍVEL
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fitness_goal" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Objetivo
                  </Label>
                  <Select value={formData.fitness_goal} onValueChange={(v) => handleChange('fitness_goal', v)}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Selecione" />
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
                <div className="space-y-2">
                  <Label htmlFor="fitness_level" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Nível
                  </Label>
                  <Select value={formData.fitness_level} onValueChange={(v) => handleChange('fitness_level', v)}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Iniciante</SelectItem>
                      <SelectItem value="intermediate">Intermediário</SelectItem>
                      <SelectItem value="advanced">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="font-bebas text-lg text-gray-500">OBSERVAÇÕES</h3>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Observações, restrições médicas, preferências..."
            className="bg-background/50 min-h-[100px]"
          />
        </div>

        {/* Password Reset Section */}
        <div className="space-y-4">
          <h3 className="font-bebas text-lg text-yellow-500 flex items-center gap-2">
            <Key className="w-5 h-5" />
            CHAVE DE ACESSO (SENHA)
          </h3>
          
          <div className="p-4 bg-background/50 rounded-lg border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Senha atual</p>
                <p className="font-mono text-lg text-yellow-500">
                  {currentLicenseKey || 'Não definida'}
                </p>
              </div>
              {currentLicenseKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(currentLicenseKey)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
            
            {newPassword && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-500 mb-1">Nova senha gerada</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xl text-green-500 font-bold">{newPassword}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newPassword)}
                    className="text-green-500 hover:text-green-400"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Anote esta senha! Ela é a nova chave de acesso do usuário.
                </p>
              </div>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => { playClickSound(); setShowResetDialog(true); }}
              className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Gerar Nova Senha
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => { playClickSound(); navigate('/admin/list-users'); }}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-yellow-500">Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja gerar uma nova senha para{' '}
              <strong>{user?.full_name || user?.username}</strong>?
              <br /><br />
              A senha atual será substituída por uma nova senha aleatória.
              O usuário precisará usar a nova senha para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingPassword}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600"
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Nova Senha
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showExitDialog}
        onOpenChange={handleCancelExit}
        onConfirmExit={handleConfirmExit}
      />
    </motion.div>
  );
};

export default EditUser;
