import React, { useState, useEffect, useRef, memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, User, Calendar, Phone, MapPin, CreditCard, Clock, Shield, Home, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileCompletionPromptProps {
  onComplete?: () => void;
  delaySeconds?: number; // Delay before showing prompt (default: 30)
}

const MAX_DISMISS_COUNT = 3; // Máximo de vezes que pode fechar antes de bloquear

const ProfileCompletionPromptInner: React.FC<ProfileCompletionPromptProps> = memo(({ 
  onComplete,
  delaySeconds = 180 // 3 minutes default for clients and instructors
}) => {
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDialog, setShowDialog] = useState(false);
  
  // Se estiver na página de perfil, não exibir o prompt
  const isOnProfilePage = location.pathname.includes('/profile');
  const [showReminder, setShowReminder] = useState(false);
  const [showDismissWarning, setShowDismissWarning] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    birth_date: '',
    cpf: '',
    city: '',
    phone: ''
  });
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedAccess = useRef(false);

  // Carregar contador de dismissões do localStorage
  useEffect(() => {
    if (profile?.profile_id) {
      const storageKey = `profile_dismiss_count_${profile.profile_id}`;
      const savedCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
      setDismissCount(savedCount);
      
      // Se já atingiu o limite, bloquear imediatamente
      if (savedCount >= MAX_DISMISS_COUNT) {
        setIsBlocked(true);
        setShowDialog(true);
      }
    }
  }, [profile?.profile_id]);

  // Log access when component mounts (once per session)
  useEffect(() => {
    if (profile?.profile_id && !hasLoggedAccess.current) {
      logAccess();
      hasLoggedAccess.current = true;
    }
  }, [profile?.profile_id]);

  const logAccess = async () => {
    if (!profile?.profile_id) return;
    
    try {
      await supabase.from('access_logs').insert({
        profile_id: profile.profile_id,
        access_method: 'web_login',
        notes: `Acesso via ${navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'}`,
      });
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  // Check which fields are missing
  const checkMissingFields = async () => {
    if (!profile?.profile_id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, birth_date, cpf, city, phone')
        .eq('id', profile.profile_id)
        .single();

      if (error) throw error;

      const missing: string[] = [];
      if (!data?.full_name) missing.push('full_name');
      if (!data?.birth_date) missing.push('birth_date');
      if (!data?.cpf) missing.push('cpf');
      if (!data?.city) missing.push('city');
      if (!data?.phone) missing.push('phone');

      setMissingFields(missing);
      setFormData({
        full_name: data?.full_name || '',
        birth_date: data?.birth_date || '',
        cpf: data?.cpf || '',
        city: data?.city || '',
        phone: data?.phone || ''
      });

      // Se tem campos faltando e não está bloqueado, iniciar timer
      if (missing.length > 0 && !isBlocked) {
        setCountdown(delaySeconds);
        
        timerRef.current = setTimeout(() => {
          setShowDialog(true);
          setCountdown(null);
        }, delaySeconds * 1000);
      } else if (missing.length > 0 && isBlocked) {
        // Se está bloqueado, mostrar diálogo imediatamente
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  // Countdown visual
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (profile?.profile_id) {
      checkMissingFields();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [profile?.profile_id, isBlocked]);

  const formatCPF = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
  };

  const handleDismissAttempt = () => {
    // Mostrar aviso de bloqueio antes de fechar
    setShowDismissWarning(true);
  };

  const handleConfirmDismiss = () => {
    if (!profile?.profile_id) return;

    const newCount = dismissCount + 1;
    const storageKey = `profile_dismiss_count_${profile.profile_id}`;
    localStorage.setItem(storageKey, newCount.toString());
    setDismissCount(newCount);
    setShowDismissWarning(false);
    setShowDialog(false);

    const remaining = MAX_DISMISS_COUNT - newCount;
    if (remaining > 0) {
      toast.warning(`Você ainda pode adiar ${remaining} vez${remaining > 1 ? 'es' : ''}. Depois disso, o acesso será bloqueado até preencher o cadastro.`);
    } else {
      // Atingiu o limite - bloquear
      setIsBlocked(true);
      toast.error('Limite atingido! Você precisa preencher o cadastro para continuar usando o sistema.');
      setShowDialog(true);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSubmit = async () => {
    if (!profile?.profile_id) return;

    // Validate required fields
    if (!formData.full_name || !formData.birth_date || !formData.cpf || !formData.city || !formData.phone) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          birth_date: formData.birth_date,
          cpf: formData.cpf,
          city: formData.city,
          phone: formData.phone
        })
        .eq('id', profile.profile_id);

      if (error) throw error;

      // Limpar contador de dismissões
      const storageKey = `profile_dismiss_count_${profile.profile_id}`;
      localStorage.removeItem(storageKey);
      setDismissCount(0);
      setIsBlocked(false);

      toast.success('Cadastro atualizado com sucesso!');
      setShowDialog(false);
      setShowReminder(false);
      setMissingFields([]);
      onComplete?.();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.message?.includes('duplicate key') || error.message?.includes('idx_profiles_cpf_unique')) {
        toast.error('Este CPF já está cadastrado no sistema');
      } else {
        toast.error('Erro ao atualizar cadastro');
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    full_name: { label: 'Nome Completo', icon: <User className="w-4 h-4" /> },
    birth_date: { label: 'Data de Nascimento', icon: <Calendar className="w-4 h-4" /> },
    cpf: { label: 'CPF', icon: <CreditCard className="w-4 h-4" /> },
    city: { label: 'Cidade', icon: <MapPin className="w-4 h-4" /> },
    phone: { label: 'Celular', icon: <Phone className="w-4 h-4" /> }
  };

  // Não exibir se não há campos faltando, se está na página de perfil, ou se é usuário master
  if (missingFields.length === 0 || isOnProfilePage || role === 'master') return null;

  const remainingDismisses = MAX_DISMISS_COUNT - dismissCount;

  return (
    <>
      {/* Countdown indicator (shows before dialog appears) */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && !showDialog && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-20 right-4 z-50"
          >
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span className="text-sm text-yellow-500 font-medium">
                Completar cadastro em {countdown}s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent warning banner when dialog is closed but fields still missing */}
      <AnimatePresence>
        {!showDialog && missingFields.length > 0 && countdown === null && !isBlocked && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 px-2"
          >
            <div 
              onClick={() => setShowDialog(true)}
              className="max-w-2xl mx-auto bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-yellow-500 transition-colors shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">
                    ⚠️ Cadastro Incompleto - Clique para preencher seus dados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Restam {remainingDismisses} tentativa{remainingDismisses !== 1 ? 's' : ''} antes do bloqueio
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs"
              >
                Preencher Agora
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full dialog for completing profile */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        // Se está bloqueado, não permite fechar de forma alguma
        if (isBlocked) {
          return;
        }
        // Se tentando fechar e tem campos faltando, mostrar aviso
        if (!open && missingFields.length > 0) {
          handleDismissAttempt();
          return;
        }
        setShowDialog(open);
      }}>
        <DialogContent 
          className="max-w-md" 
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (isBlocked) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              {isBlocked ? <Lock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {isBlocked ? 'ACESSO BLOQUEADO - Preencha o Cadastro' : 'Complete seu Cadastro - OBRIGATÓRIO'}
            </DialogTitle>
            <DialogDescription>
              {isBlocked ? (
                <span className="text-red-500 font-medium">
                  Você adiou {MAX_DISMISS_COUNT} vezes. O acesso ao sistema está bloqueado até que você preencha todos os campos obrigatórios abaixo.
                </span>
              ) : (
                <>
                  <span className="text-yellow-500 font-medium">Atenção:</span> Para sua segurança e conformidade com a LGPD, é obrigatório preencher os dados abaixo.
                  {remainingDismisses > 0 && (
                    <span className="block mt-1 text-orange-400 text-xs">
                      Você pode adiar mais {remainingDismisses} vez{remainingDismisses !== 1 ? 'es' : ''} antes do bloqueio total.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {missingFields.includes('full_name') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  Nome Completo *
                </Label>
                <Input
                  placeholder="Digite seu nome completo"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
            )}

            {missingFields.includes('birth_date') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Data de Nascimento *
                </Label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>
            )}

            {missingFields.includes('cpf') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-500" />
                  CPF *
                </Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                  maxLength={14}
                />
              </div>
            )}

            {missingFields.includes('city') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Cidade *
                </Label>
                <Input
                  placeholder="Digite sua cidade"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
            )}

            {missingFields.includes('phone') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-cyan-500" />
                  Celular *
                </Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                  maxLength={15}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isBlocked ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Voltar para Início
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !formData.full_name || !formData.birth_date || !formData.cpf || !formData.city || !formData.phone}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {loading ? 'Salvando...' : 'Preencher e Liberar Acesso'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground text-center sm:text-left flex-1">
                  Seus dados estão protegidos pela LGPD
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !formData.full_name || !formData.birth_date || !formData.cpf || !formData.city || !formData.phone}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  {loading ? 'Salvando...' : 'Salvar e Continuar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Warning Dialog */}
      <AlertDialog open={showDismissWarning} onOpenChange={setShowDismissWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertTriangle className="w-5 h-5" />
              Aviso de Bloqueio
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está adiando o preenchimento do cadastro pela <strong>{dismissCount + 1}ª vez</strong>.
              </p>
              {remainingDismisses > 1 ? (
                <p className="text-orange-400">
                  Após mais <strong>{remainingDismisses - 1}</strong> tentativa{remainingDismisses - 1 !== 1 ? 's' : ''}, 
                  o acesso ao sistema será <strong>BLOQUEADO</strong> até que você preencha todos os dados.
                </p>
              ) : remainingDismisses === 1 ? (
                <p className="text-red-500 font-medium">
                  ⚠️ ÚLTIMA CHANCE! Se fechar novamente, o acesso será BLOQUEADO até preencher o cadastro.
                </p>
              ) : (
                <p className="text-red-500 font-medium">
                  ⚠️ O acesso será BLOQUEADO imediatamente!
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDismissWarning(false)}>
              Voltar e Preencher
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDismiss}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Entendi, Fechar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

ProfileCompletionPromptInner.displayName = 'ProfileCompletionPrompt';

// Forward ref wrapper for compatibility
const ProfileCompletionPrompt = forwardRef<HTMLDivElement, ProfileCompletionPromptProps>((props, ref) => (
  <ProfileCompletionPromptInner {...props} />
));

ProfileCompletionPrompt.displayName = 'ProfileCompletionPrompt';

export default ProfileCompletionPrompt;
