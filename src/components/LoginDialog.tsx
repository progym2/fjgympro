import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, LogIn, AlertCircle, Eye, EyeOff, Loader2, Trash2, Fingerprint, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { toast } from '@/hooks/use-toast';
import logomarca from '@/assets/logomarca.png';
import heroGym from '@/assets/hero-gym.jpg';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import SportThemeSelector from '@/components/SportThemeSelector';
import LoginLoadingOverlay from '@/components/LoginLoadingOverlay';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: string) => void;
  panelType: 'client' | 'instructor' | 'admin';
}

const STORAGE_KEY = 'francgym_saved_credentials';
const BIOMETRIC_KEY = 'francgym_biometric_enabled';
const LOCKOUT_KEY = 'francgym_login_lockout';

// Escalating lockout durations in seconds: 30s, 1min, 2min, 5min, 15min
const LOCKOUT_DURATIONS = [30, 60, 120, 300, 900];
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 3;

interface LockoutData {
  attempts: number;
  lockedUntil: number | null;
  lockoutLevel: number;
}

const MotionOverlay = motion.div;

const MotionErrorBox = motion.div;

const MotionLockoutBox = motion.div;

// Check if Web Authentication API is available
const isBiometricAvailable = () => {
  return window.PublicKeyCredential !== undefined && 
         typeof window.PublicKeyCredential === 'function';
};

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onSuccess, panelType }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shakeForm, setShakeForm] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(true);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  // Lockout state
  const [lockoutData, setLockoutData] = useState<LockoutData>({ attempts: 0, lockedUntil: null, lockoutLevel: 0 });
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);

  const { signIn, clearDeviceSession } = useAuth();
  const { playClickSound, playNotificationSound } = useAudio();
  
  // Função para tocar som de erro
  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('Error sound not available');
    }
  };
  
  // Função para disparar shake + som
  const triggerErrorFeedback = () => {
    setShakeForm(true);
    playErrorSound();
    setTimeout(() => setShakeForm(false), 500);
  };

  // Load lockout data from localStorage
  const loadLockoutData = useCallback(() => {
    try {
      const saved = localStorage.getItem(LOCKOUT_KEY);
      if (saved) {
        const parsed: LockoutData = JSON.parse(saved);
        // Check if lockout has expired
        if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
          // Lockout expired, reset attempts but keep level for next time
          const newData = { ...parsed, lockedUntil: null, attempts: 0 };
          localStorage.setItem(LOCKOUT_KEY, JSON.stringify(newData));
          setLockoutData(newData);
        } else {
          setLockoutData(parsed);
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  // Update lockout countdown timer
  useEffect(() => {
    if (!lockoutData.lockedUntil) {
      setLockoutTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockoutData.lockedUntil! - Date.now()) / 1000));
      setLockoutTimeRemaining(remaining);
      
      if (remaining === 0) {
        // Lockout expired
        const newData = { ...lockoutData, lockedUntil: null, attempts: 0 };
        localStorage.setItem(LOCKOUT_KEY, JSON.stringify(newData));
        setLockoutData(newData);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutData.lockedUntil]);

  // Handle keyboard ESC to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading]);

  // Check biometric support and load saved credentials on mount
  useEffect(() => {
    // Load lockout data
    loadLockoutData();

    // Check if biometric is supported
    const checkBiometricSupport = async () => {
      if (isBiometricAvailable()) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricSupported(available);
        } catch {
          setBiometricSupported(false);
        }
      }
    };
    checkBiometricSupport();

    // Load saved credentials
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username && parsed.password) {
          setUsername(parsed.username);
          setPassword(parsed.password);
          setHasSavedCredentials(true);
        }
      }
      
      // Check if biometric is enabled for this device
      const biometricData = localStorage.getItem(BIOMETRIC_KEY);
      if (biometricData) {
        setBiometricEnabled(true);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [isOpen, loadLockoutData]);

  // Auto-trigger biometric login when dialog opens and biometric is enabled
  // Only if biometric is supported on this device
  useEffect(() => {
    if (isOpen && biometricEnabled && biometricSupported && hasSavedCredentials && !isLoading) {
      handleBiometricLogin();
    }
  }, [isOpen, biometricEnabled, biometricSupported, hasSavedCredentials]);

  const handleBiometricLogin = async () => {
    if (!hasSavedCredentials) {
      toast({
        title: 'Credenciais não encontradas',
        description: 'Faça login com usuário e senha primeiro para habilitar biometria.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use a simple challenge for local authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      };

      // This will trigger the biometric prompt
      await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      // If we get here, biometric verification succeeded
      // Now login with saved credentials
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const result = await signIn(parsed.username, parsed.password, panelType);

        if (result.error) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Login biométrico realizado!',
          description: 'Bem-vindo ao FrancGymPro',
          duration: 2000,
        });

        setIsLoading(false);
        onSuccess(result.role ?? panelType);
      }
    } catch (err: any) {
      console.error('Biometric auth error:', err);
      if (err.name === 'NotAllowedError') {
        // User cancelled or biometric failed
        setError('Autenticação biométrica cancelada ou falhou. Use usuário e senha.');
      } else if (err.name === 'NotSupportedError') {
        // Silently disable biometric without showing error toast
        console.log('Biometrics not supported on this device, disabling silently');
        setBiometricEnabled(false);
        localStorage.removeItem(BIOMETRIC_KEY);
        // Don't set error - just let user use password
      } else {
        // Fall back to regular login
        setError('Erro na biometria. Use usuário e senha.');
      }
      setIsLoading(false);
    }
  };

  const enableBiometric = async () => {
    if (!hasSavedCredentials) {
      toast({
        title: 'Salve suas credenciais primeiro',
        description: 'Marque "Lembrar credenciais" e faça login para habilitar biometria.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Create a credential for biometric authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'FrancGymPro',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: username || 'user',
          displayName: username || 'Usuário',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      if (credential) {
        // Store that biometric is enabled
        localStorage.setItem(BIOMETRIC_KEY, JSON.stringify({
          credentialId: (credential as PublicKeyCredential).id,
          enabledAt: new Date().toISOString()
        }));
        setBiometricEnabled(true);
        
        toast({
          title: 'Biometria ativada!',
          description: 'Você pode usar sua digital/Face ID para fazer login.',
        });
      }
    } catch (err: any) {
      console.error('Error enabling biometric:', err);
      if (err.name === 'NotAllowedError') {
        toast({
          title: 'Biometria cancelada',
          description: 'Você cancelou a configuração da biometria.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro ao ativar biometria',
          description: 'Seu dispositivo pode não suportar esta funcionalidade.',
          variant: 'destructive'
        });
      }
    }
  };

  const disableBiometric = () => {
    localStorage.removeItem(BIOMETRIC_KEY);
    setBiometricEnabled(false);
    toast({
      title: 'Biometria desativada',
      description: 'Login biométrico foi removido.',
    });
  };

  const panelLabels = {
    client: 'CLIENTE',
    instructor: 'INSTRUTOR',
    admin: 'GERENTE',
  };

  // Handle failed login attempt and escalating lockout
  const handleFailedAttempt = () => {
    const newAttempts = lockoutData.attempts + 1;
    
    if (newAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      // Trigger lockout
      const lockoutLevel = Math.min(lockoutData.lockoutLevel, LOCKOUT_DURATIONS.length - 1);
      const lockoutDuration = LOCKOUT_DURATIONS[lockoutLevel] * 1000;
      const lockedUntil = Date.now() + lockoutDuration;
      
      const newData: LockoutData = {
        attempts: 0,
        lockedUntil,
        lockoutLevel: Math.min(lockoutLevel + 1, LOCKOUT_DURATIONS.length - 1)
      };
      
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(newData));
      setLockoutData(newData);
      
      toast({
        title: '🔒 Conta Bloqueada Temporariamente',
        description: `Muitas tentativas incorretas. Aguarde ${formatLockoutTime(LOCKOUT_DURATIONS[lockoutLevel])}.`,
        variant: 'destructive',
      });
    } else {
      const newData = { ...lockoutData, attempts: newAttempts };
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(newData));
      setLockoutData(newData);
    }
  };

  // Format lockout time for display
  const formatLockoutTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
  };

  // Reset lockout on successful login
  const resetLockout = () => {
    const newData: LockoutData = { attempts: 0, lockedUntil: null, lockoutLevel: 0 };
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(newData));
    setLockoutData(newData);
  };

  // Check if currently locked out
  const isLockedOut = lockoutData.lockedUntil && Date.now() < lockoutData.lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setError('');
    
    // Check if locked out
    if (isLockedOut) {
      setError(`🔒 Conta bloqueada. Aguarde ${formatLockoutTime(lockoutTimeRemaining)}.`);
      triggerErrorFeedback();
      return;
    }
    
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('⚠️ Preencha todos os campos para continuar');
      triggerErrorFeedback();
      setIsLoading(false);
      return;
    }

    const result = await signIn(username.trim(), password.trim(), panelType);

    if (result.error) {
      // Mensagens de erro amigáveis para o usuário (sem termos técnicos)
      let errorMessage = '';
      const errorLower = result.error.toLowerCase();
      const isPasswordError = errorLower.includes('senha') && (errorLower.includes('incorreta') || errorLower.includes('inválid'));
      const isLicenseExpired = errorLower.includes('expirou') || errorLower.includes('expirada') || errorLower.includes('demonstração') || errorLower.includes('teste');
      
      if (isLicenseExpired) {
        // Mensagem clara sobre licença expirada
        if (errorLower.includes('demonstração')) {
          errorMessage = '⏰ Seu período de demonstração terminou. Entre em contato para continuar usando o sistema.';
        } else if (errorLower.includes('teste')) {
          errorMessage = '⏰ Seu período de teste terminou. Entre em contato para adquirir uma licença.';
        } else {
          errorMessage = '⏰ Sua licença expirou. Entre em contato para renovar seu acesso.';
        }
      } else if (isPasswordError) {
        const remainingAttempts = MAX_ATTEMPTS_BEFORE_LOCKOUT - lockoutData.attempts - 1;
        errorMessage = `🔐 Senha incorreta. ${remainingAttempts > 0 ? `Você ainda tem ${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''}.` : 'Última tentativa!'}`;
        handleFailedAttempt();
      } else if (errorLower.includes('não encontrado') || errorLower.includes('usuário')) {
        errorMessage = '👤 Usuário não encontrado. Verifique se digitou corretamente.';
      } else if (errorLower.includes('acesso negado') || errorLower.includes('painel')) {
        // Simplificar mensagem de acesso ao painel
        errorMessage = '🚫 Você não tem permissão para acessar este painel. Tente outro painel.';
      } else if (errorLower.includes('bloqueado')) {
        errorMessage = '🔒 Sua conta está temporariamente bloqueada. Aguarde alguns minutos.';
      } else {
        // Mensagem genérica amigável para qualquer outro erro
        errorMessage = '❌ Não foi possível entrar. Verifique seus dados e tente novamente.';
      }
      
      setError(errorMessage);
      triggerErrorFeedback();
      setIsLoading(false);

      if (result.licenseExpired || isLicenseExpired) {
        toast({
          title: '⏰ Licença Expirada',
          description: 'Seu período de uso terminou. Entre em contato para renovar.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Não foi possível entrar',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      return;
    }
    
    // Reset lockout on successful login
    resetLockout();

    // Save credentials if option is enabled
    if (rememberCredentials) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }));
        setHasSavedCredentials(true);
      } catch (e) {
        // Ignore storage errors
      }
    }

    toast({
      title: 'Login realizado com sucesso!',
      description: 'Bem-vindo ao FrancGymPro',
      duration: 2000,
    });

    setIsLoading(false);

    // Navigate by REAL role (music will start inside dashboards only)
    onSuccess(result.role ?? panelType);
  };

  const clearSavedCredentials = () => {
    playClickSound();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BIOMETRIC_KEY);
      setUsername('');
      setPassword('');
      setHasSavedCredentials(false);
      setBiometricEnabled(false);
      toast({
        title: 'Credenciais removidas',
        description: 'Suas credenciais foram apagadas deste dispositivo',
      });
    } catch (e) {
      // Ignore errors
    }
  };

  const handleClearDeviceSession = async () => {
    playClickSound();
    setError('');
    setIsLoading(true);
    try {
      await clearDeviceSession();
      // Também removemos credenciais/biometria salvas para evitar login automático com dados antigos.
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BIOMETRIC_KEY);
      setUsername('');
      setPassword('');
      setHasSavedCredentials(false);
      setBiometricEnabled(false);

      toast({
        title: 'Sessão limpa',
        description: 'Sessão e dados de login removidos deste dispositivo. Faça login novamente.',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    playClickSound();
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onMouseDown={(e) => {
            // Only close if left-click directly on overlay (not right-click for context menu)
            if (e.button === 0 && e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="relative w-full max-w-md bg-card rounded-2xl border border-primary/30 shadow-2xl shadow-primary/20 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading Overlay */}
            <LoginLoadingOverlay isVisible={isLoading} message="Autenticando..." />
            {/* Background Image with overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src={heroGym} 
                alt="" 
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
            </div>

            {/* Theme Selector - Top Right */}
            <div className="absolute top-4 right-4 z-10">
              <SportThemeSelector compact />
            </div>

            {/* Back Button - Discrete ESC option */}
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/60 hover:bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground transition-all text-xs font-medium backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={14} />
              <span>Voltar</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-mono">ESC</kbd>
            </button>

            {/* Header with professional design */}
            <div className="relative z-10 p-8 pt-12 text-center bg-gradient-to-b from-primary/10 via-transparent to-transparent">
              {/* Gym Icon Badge */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-primary/10"
              >
                <motion.img
                  src={logomarca}
                  alt="FrancGymPro"
                  className="w-16 h-16 object-contain"
                  animate={{ 
                    filter: ['drop-shadow(0 0 10px hsl(var(--primary)/0.3))', 'drop-shadow(0 0 20px hsl(var(--primary)/0.6))', 'drop-shadow(0 0 10px hsl(var(--primary)/0.3))']
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bebas text-foreground tracking-wider"
              >
                PAINEL DO <span className="text-primary">{panelLabels[panelType]}</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mt-1"
              >
                Digite suas credenciais para acessar
              </motion.p>

              {/* Decorative line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              />
            </div>

            {/* Form with shake animation */}
            <motion.form 
              onSubmit={handleSubmit} 
              className="relative z-10 p-8 pt-4 space-y-5"
              animate={shakeForm ? {
                x: [0, -10, 10, -10, 10, -5, 5, 0],
                transition: { duration: 0.5 }
              } : {}}
            >
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <MotionErrorBox
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-destructive/20 border-2 border-destructive/50 text-destructive shadow-lg shadow-destructive/20"
                  >
                    <AlertCircle size={22} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Erro no Login</p>
                      <p className="text-sm opacity-90 mt-0.5">{error}</p>
                    </div>
                  </MotionErrorBox>
                )}
                
                {/* Lockout Warning */}
                {isLockedOut && (
                  <MotionErrorBox
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/20 border-2 border-orange-500/50 text-orange-400"
                  >
                    <Lock size={22} className="shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Conta Bloqueada</p>
                      <p className="text-sm opacity-90">Aguarde {formatLockoutTime(lockoutTimeRemaining)} para tentar novamente</p>
                    </div>
                  </MotionErrorBox>
                )}
              </AnimatePresence>

              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <User size={12} className="text-primary" />
                  Usuário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').trim();
                      setUsername(pasted);
                    }}
                    placeholder="Digite seu usuário"
                    disabled={isLoading}
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full px-4 py-3 bg-background/80 border border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-50 placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <Lock size={12} className="text-primary" />
                  Senha / Chave de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').trim();
                      setPassword(pasted);
                    }}
                    placeholder="Digite sua senha ou chave de acesso"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full px-4 pr-12 py-3 bg-background/80 border border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-50 placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cadastrado pela academia? Use a chave de acesso fornecida.
                </p>
              </div>

              {/* Remember Credentials & Clear Option */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberCredentials}
                      onCheckedChange={(checked) => setRememberCredentials(checked as boolean)}
                    />
                    <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                      Lembrar credenciais
                    </label>
                  </div>

                  {hasSavedCredentials && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSavedCredentials}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                    >
                      <Trash2 size={12} className="mr-1" />
                      Limpar dados salvos
                    </Button>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearDeviceSession}
                  disabled={isLoading}
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  Limpar sessão deste dispositivo
                </Button>
              </div>

              {/* Biometric Login Option */}
              <div className="space-y-2">
                {biometricSupported ? (
                  <>
                    {biometricEnabled ? (
                      <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Fingerprint size={20} className="text-primary" />
                          <span className="text-sm text-primary">Biometria ativada</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleBiometricLogin}
                            disabled={isLoading}
                            className="bg-primary hover:bg-primary/90 h-8"
                          >
                            <Fingerprint size={14} className="mr-1" />
                            Usar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={disableBiometric}
                            className="text-destructive hover:text-destructive h-8"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ) : hasSavedCredentials && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={enableBiometric}
                        className="w-full border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Fingerprint size={18} className="mr-2" />
                        Ativar Login Biométrico
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground bg-muted/30 rounded-md">
                    <Fingerprint size={14} className="opacity-50" />
                    <span>Biometria não disponível neste dispositivo</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading || isLockedOut}
                whileHover={{ scale: isLoading || isLockedOut ? 1 : 1.02 }}
                whileTap={{ scale: isLoading || isLockedOut ? 1 : 0.98 }}
                className={`w-full py-3 font-bebas text-lg tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLockedOut 
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                    : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70'
                }`}
              >
                {isLockedOut ? (
                  <>
                    <Lock size={20} />
                    BLOQUEADO ({formatLockoutTime(lockoutTimeRemaining)})
                  </>
                ) : isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    ENTRAR
                  </>
                )}
              </motion.button>

              {/* Demo Hints */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-center text-muted-foreground">
                  <span className="text-primary">Dica:</span> Use{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">teste</code> /{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">2026</code> para demonstração de 30 min
                </p>

                {import.meta.env.DEV && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-center text-muted-foreground">
                      <span className="text-primary">Dev:</span> Master{' '}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">franc</code> /{' '}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">125758</code>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUsername('franc');
                        setPassword('125758');
                      }}
                      disabled={isLoading}
                      className="w-full border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Preencher Master (DEV)
                    </Button>
                  </div>
                )}
              </div>
            </motion.form>
          </motion.div>
        </MotionOverlay>
      )}
    </AnimatePresence>
  );
};

export default LoginDialog;
