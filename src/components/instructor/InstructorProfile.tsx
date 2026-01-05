import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Save, Key, Info, Award, Phone, Mail, Calendar, IdCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filterPhoneOnly, formatCPF, validateCPF, getCPFDigits } from '@/lib/inputValidation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InstructorPageHeader from './InstructorPageHeader';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';

const InstructorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    cref: '',
    notes: '',
    cpf: '',
    city: ''
  });
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [linkedStudentsCount, setLinkedStudentsCount] = useState(0);
  const [cpfError, setCpfError] = useState('');

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
          email: data.email || '',
          phone: data.phone || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          cref: data.cref || '',
          notes: data.notes || '',
          cpf: (data as any).cpf || '',
          city: (data as any).city || ''
        });
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

      // Count linked students
      const { count } = await supabase
        .from('instructor_clients')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', profile.profile_id)
        .eq('is_active', true)
        .eq('link_status', 'accepted');

      setLinkedStudentsCount(count || 0);
    };
    
    loadProfile();
  }, [profile?.profile_id]);

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
          email: formData.email,
          phone: formData.phone,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          cref: formData.cref,
          notes: formData.notes,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <InstructorPageHeader 
        title="MEU PERFIL" 
        icon={<User className="w-5 h-5" />} 
        iconColor="text-green-500" 
      />

      <div className="flex-1 overflow-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <User size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{linkedStudentsCount}</p>
                <p className="text-xs text-muted-foreground">Alunos Vinculados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <IdCard size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary truncate">{formData.cref || 'Não informado'}</p>
                <p className="text-xs text-muted-foreground">CREF</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 col-span-2 md:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Award size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-500">Instrutor</p>
                <p className="text-xs text-muted-foreground">Cargo no Sistema</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Login Credentials Card */}
          <Card className="bg-card/80 backdrop-blur-md border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="font-bebas text-xl tracking-wider text-green-500 flex items-center gap-2">
                <Key className="w-5 h-5" />
                DADOS DE ACESSO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Personal Info Card */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-bebas text-xl tracking-wider flex items-center gap-2">
                <User className="w-5 h-5 text-green-500" />
                DADOS PESSOAIS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label>CREF (Registro Profissional)</Label>
                  <Input
                    value={formData.cref}
                    onChange={(e) => setFormData({ ...formData, cref: e.target.value.toUpperCase() })}
                    placeholder="000000-G/UF"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Mail size={14} />
                    E-mail
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Phone size={14} />
                    Telefone
                  </Label>
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
                  <Label className="flex items-center gap-1">
                    <Calendar size={14} />
                    Data de Nascimento
                  </Label>
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

              <div className="space-y-2">
                <Label>Observações / Bio</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre você, especialidades, formação..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !!cpfError}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default InstructorProfile;
