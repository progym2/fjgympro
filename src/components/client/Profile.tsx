import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Save, Calculator, Shield, Award, Key, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filterNumericOnly, filterDecimalOnly, filterPhoneOnly, preventNonNumericInput, preventNonDecimalInput, formatCPF, validateCPF, getCPFDigits } from '@/lib/inputValidation';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ClientPageHeader from './ClientPageHeader';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone: '',
    birth_date: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    fitness_goal: 'maintenance',
    fitness_level: 'beginner',
    cpf: '',
    city: ''
  });
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [imc, setImc] = useState<number | null>(null);
  const [imcClassification, setImcClassification] = useState('');
  const [instructorLevel, setInstructorLevel] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState('');

  // ESC volta para /client
  useEscapeBack({ to: '/client' });

  useEffect(() => {
    const loadProfile = async () => {
      if (!profile?.profile_id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.profile_id)
        .maybeSingle();
      
      if (data && !error) {
        setFormData({
          username: data.username || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          height_cm: data.height_cm?.toString() || '',
          weight_kg: data.weight_kg?.toString() || '',
          fitness_goal: data.fitness_goal || 'maintenance',
          fitness_level: data.fitness_level || 'beginner',
          cpf: (data as any).cpf || '',
          city: (data as any).city || ''
        });
        setStudentId(data.student_id || null);
      }

      // Fetch license key for display
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('license_key')
        .eq('profile_id', profile.profile_id)
        .eq('status', 'active')
        .maybeSingle();

      if (licenseData) {
        setLicenseKey(licenseData.license_key);
      }

      // Check if level was set by instructor
      const { data: linkData } = await supabase
        .from('instructor_clients')
        .select(`
          fitness_level_by_instructor,
          profiles!instructor_clients_instructor_id_fkey (full_name)
        `)
        .eq('client_id', profile.profile_id)
        .eq('is_active', true)
        .maybeSingle();

      if (linkData?.fitness_level_by_instructor) {
        setInstructorLevel(linkData.fitness_level_by_instructor);
        setInstructorName((linkData.profiles as any)?.full_name || 'Instrutor');
      }
    };
    
    loadProfile();
  }, [profile?.profile_id]);

  useEffect(() => {
    calculateIMC();
  }, [formData.height_cm, formData.weight_kg]);

  const calculateIMC = () => {
    const height = parseFloat(formData.height_cm) / 100;
    const weight = parseFloat(formData.weight_kg);
    
    if (height > 0 && weight > 0) {
      const imcValue = weight / (height * height);
      setImc(imcValue);
      
      if (imcValue < 18.5) {
        setImcClassification('Abaixo do peso');
      } else if (imcValue < 25) {
        setImcClassification('Peso normal');
      } else if (imcValue < 30) {
        setImcClassification('Sobrepeso');
      } else if (imcValue < 35) {
        setImcClassification('Obesidade Grau I');
      } else if (imcValue < 40) {
        setImcClassification('Obesidade Grau II');
      } else {
        setImcClassification('Obesidade Grau III');
      }
    } else {
      setImc(null);
      setImcClassification('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.profile_id) return;

    // Validate CPF if provided
    if (formData.cpf && getCPFDigits(formData.cpf).length === 11) {
      if (!validateCPF(formData.cpf)) {
        setCpfError('CPF inválido - verifique os dígitos');
        toast.error('CPF inválido');
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          fitness_goal: formData.fitness_goal as any,
          fitness_level: formData.fitness_level,
          cpf: formData.cpf || null,
          city: formData.city || null
        })
        .eq('id', profile.profile_id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const getImcColor = () => {
    if (!imc) return 'text-muted-foreground';
    if (imc < 18.5) return 'text-yellow-500';
    if (imc < 25) return 'text-green-500';
    if (imc < 30) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="MEU PERFIL" 
        icon={<User className="w-5 h-5" />} 
        iconColor="text-primary" 
      />

      <div className="flex-1 overflow-auto">
        <div className="grid md:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-4">
          {/* Login Credentials Card */}
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-primary/30 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="font-bebas text-xl tracking-wider text-primary">DADOS DE ACESSO</h3>
            </div>
            
            <Alert className="bg-muted/50 border-border">
              <Info className="h-4 w-4" />
              <AlertDescription>
                O nome de usuário é definido no cadastro e não pode ser alterado. Use-o junto com sua chave de licença para fazer login.
              </AlertDescription>
            </Alert>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome de Usuário (Login)</Label>
                <div className="p-3 bg-muted/50 border border-border rounded-lg font-mono text-sm uppercase">
                  {formData.username || '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Este é seu identificador único de acesso
                </p>
              </div>
              <div className="space-y-2">
                <Label>Sua Senha (Chave de Licença)</Label>
                <div className="p-3 bg-muted/50 border border-border rounded-lg font-mono text-sm">
                  {licenseKey || '••••-••••-••••'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use esta chave como senha ao fazer login
                </p>
              </div>
            </div>

            {studentId && (
              <div className="space-y-2">
                <Label>ID do Aluno (Matrícula)</Label>
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg font-mono text-lg text-center text-primary font-bold">
                  {studentId}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Use este código para verificar sua matrícula na consulta pública
                </p>
              </div>
            )}
          </div>

          {/* Personal Info Card */}
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-bebas text-xl tracking-wider">DADOS PESSOAIS</h3>
            </div>

            {/* Profile Photo */}
            <div className="flex justify-center py-4">
              <ProfilePhotoUploader profileId={profile?.profile_id} size="lg" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: filterPhoneOnly(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <div className="relative">
                  <Input
                    value={formData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setFormData({ ...formData, cpf: formatted });
                      // Validate when complete
                      const digits = getCPFDigits(formatted);
                      if (digits.length === 11) {
                        if (!validateCPF(formatted)) {
                          setCpfError('CPF inválido - verifique os dígitos');
                        } else {
                          setCpfError('');
                        }
                      } else {
                        setCpfError('');
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={cpfError ? 'border-destructive pr-10' : getCPFDigits(formData.cpf).length === 11 && !cpfError ? 'border-green-500 pr-10' : ''}
                  />
                  {getCPFDigits(formData.cpf).length === 11 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cpfError ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {cpfError && (
                  <p className="text-xs text-destructive">{cpfError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Sua cidade"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger>
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

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: filterNumericOnly(e.target.value) })}
                  onKeyDown={preventNonNumericInput}
                  placeholder="170"
                  inputMode="numeric"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: filterDecimalOnly(e.target.value) })}
                  onKeyDown={(e) => preventNonDecimalInput(e, formData.weight_kg)}
                  placeholder="70.5"
                  inputMode="decimal"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select value={formData.fitness_goal} onValueChange={(v) => setFormData({ ...formData, fitness_goal: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Perder Peso</SelectItem>
                    <SelectItem value="muscle_gain">Ganhar Massa</SelectItem>
                    <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                    <SelectItem value="conditioning">Condicionamento</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível</Label>
                {instructorLevel ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {instructorLevel === 'beginner' && 'Iniciante'}
                        {instructorLevel === 'intermediate' && 'Intermediário'}
                        {instructorLevel === 'advanced' && 'Avançado'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Definido por {instructorName}. Este campo só pode ser alterado pelo seu instrutor.
                    </p>
                  </div>
                ) : (
                  <Select value={formData.fitness_level} onValueChange={(v) => setFormData({ ...formData, fitness_level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Iniciante</SelectItem>
                      <SelectItem value="intermediate">Intermediário</SelectItem>
                      <SelectItem value="advanced">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading || !!cpfError} className="w-full">
            <Save size={18} className="mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>

        {/* IMC Card */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-primary" />
            <h3 className="font-bebas text-xl tracking-wider">CALCULADORA IMC</h3>
          </div>

          {imc ? (
            <div className="text-center space-y-4">
              <div className={`text-5xl font-bold ${getImcColor()}`}>
                {imc.toFixed(1)}
              </div>
              <div className={`text-lg font-medium ${getImcColor()}`}>
                {imcClassification}
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Seu IMC está calculado com base em:</p>
                <p>Altura: {formData.height_cm}cm | Peso: {formData.weight_kg}kg</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>Preencha sua altura e peso para calcular o IMC</p>
            </div>
          )}

          <div className="mt-6 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Abaixo do peso</span>
              <span>&lt; 18.5</span>
            </div>
            <div className="flex justify-between">
              <span>Peso normal</span>
              <span>18.5 - 24.9</span>
            </div>
            <div className="flex justify-between">
              <span>Sobrepeso</span>
              <span>25 - 29.9</span>
            </div>
            <div className="flex justify-between">
              <span>Obesidade</span>
              <span>≥ 30</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
};

export default Profile;
