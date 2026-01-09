import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import AnimatedLogo from '@/components/AnimatedLogo';
import ThemedParticles from '@/components/ThemedParticles';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import { useDataPreloader } from '@/hooks/useDataPreloader';
import bgHomeOptimized from '@/assets/bg-home-optimized.webp';

// Animação de entrada para os cards
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

interface PanelOption {
  id: 'client' | 'instructor' | 'admin';
  label: string;
  icon: React.ElementType;
  route: string;
}

const panels: PanelOption[] = [
  { id: 'client', label: 'CLIENTE', icon: User, route: '/client' },
  { id: 'instructor', label: 'INSTRUTOR', icon: Dumbbell, route: '/instructor' },
  { id: 'admin', label: 'GERENTE', icon: Shield, route: '/admin' },
];

// Estilos únicos por tema para os botões do PanelSelector
// Estilos únicos por tema - cores otimizadas para legibilidade (sem cinza, preto no lugar)
const getThemePanelStyles = (themeId: SportTheme) => {
  const styles: Record<SportTheme, {
    client: { bg: string; border: string; icon: string; glow: string };
    instructor: { bg: string; border: string; icon: string; glow: string };
    admin: { bg: string; border: string; icon: string; glow: string };
    shape: string;
  }> = {
    fire: {
      client: { bg: 'from-orange-600/35 to-red-600/25', border: 'border-orange-500/60', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.4)' },
      instructor: { bg: 'from-amber-600/35 to-orange-600/25', border: 'border-amber-500/60', icon: 'text-amber-400', glow: 'rgba(245,158,11,0.4)' },
      admin: { bg: 'from-red-600/35 to-orange-700/25', border: 'border-red-500/60', icon: 'text-red-400', glow: 'rgba(220,38,38,0.4)' },
      shape: 'rounded-xl',
    },
    ocean: {
      client: { bg: 'from-cyan-600/35 to-blue-600/25', border: 'border-cyan-500/60', icon: 'text-cyan-400', glow: 'rgba(6,182,212,0.4)' },
      instructor: { bg: 'from-teal-600/35 to-cyan-600/25', border: 'border-teal-500/60', icon: 'text-teal-400', glow: 'rgba(20,184,166,0.4)' },
      admin: { bg: 'from-blue-600/35 to-indigo-600/25', border: 'border-blue-500/60', icon: 'text-blue-400', glow: 'rgba(59,130,246,0.4)' },
      shape: 'rounded-2xl',
    },
    forest: {
      client: { bg: 'from-green-600/35 to-emerald-600/25', border: 'border-green-500/60', icon: 'text-green-400', glow: 'rgba(34,197,94,0.4)' },
      instructor: { bg: 'from-lime-600/35 to-green-600/25', border: 'border-lime-500/60', icon: 'text-lime-400', glow: 'rgba(132,204,22,0.4)' },
      admin: { bg: 'from-emerald-600/35 to-teal-600/25', border: 'border-emerald-500/60', icon: 'text-emerald-400', glow: 'rgba(16,185,129,0.4)' },
      shape: 'rounded-xl',
    },
    lightning: {
      client: { bg: 'from-amber-600/40 to-yellow-600/30', border: 'border-amber-500/70', icon: 'text-amber-400', glow: 'rgba(245,158,11,0.45)' },
      instructor: { bg: 'from-orange-600/40 to-amber-600/30', border: 'border-orange-500/70', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.45)' },
      admin: { bg: 'from-yellow-600/40 to-orange-600/30', border: 'border-yellow-500/70', icon: 'text-yellow-400', glow: 'rgba(234,179,8,0.45)' },
      shape: 'rounded-lg',
    },
    galaxy: {
      client: { bg: 'from-purple-600/35 to-violet-600/25', border: 'border-purple-500/60', icon: 'text-purple-400', glow: 'rgba(168,85,247,0.4)' },
      instructor: { bg: 'from-fuchsia-600/35 to-purple-600/25', border: 'border-fuchsia-500/60', icon: 'text-fuchsia-400', glow: 'rgba(217,70,239,0.4)' },
      admin: { bg: 'from-violet-600/35 to-indigo-600/25', border: 'border-violet-500/60', icon: 'text-violet-400', glow: 'rgba(139,92,246,0.4)' },
      shape: 'rounded-3xl',
    },
    iron: {
      client: { bg: 'from-zinc-700/45 to-black/35', border: 'border-zinc-500/70', icon: 'text-white', glow: 'rgba(161,161,170,0.3)' },
      instructor: { bg: 'from-slate-700/45 to-black/35', border: 'border-slate-500/70', icon: 'text-white', glow: 'rgba(148,163,184,0.3)' },
      admin: { bg: 'from-neutral-700/45 to-black/35', border: 'border-neutral-500/70', icon: 'text-white', glow: 'rgba(115,115,115,0.3)' },
      shape: 'rounded-md',
    },
    blood: {
      client: { bg: 'from-red-700/40 to-rose-700/30', border: 'border-red-600/65', icon: 'text-red-400', glow: 'rgba(220,38,38,0.45)' },
      instructor: { bg: 'from-rose-700/40 to-red-700/30', border: 'border-rose-600/65', icon: 'text-rose-400', glow: 'rgba(225,29,72,0.45)' },
      admin: { bg: 'from-red-800/40 to-rose-800/30', border: 'border-red-700/65', icon: 'text-red-500', glow: 'rgba(185,28,28,0.45)' },
      shape: 'rounded-xl',
    },
    neon: {
      client: { bg: 'from-pink-600/40 to-fuchsia-600/30', border: 'border-pink-500/70', icon: 'text-pink-400', glow: 'rgba(236,72,153,0.5)' },
      instructor: { bg: 'from-cyan-500/40 to-blue-600/30', border: 'border-cyan-400/70', icon: 'text-cyan-400', glow: 'rgba(34,211,238,0.5)' },
      admin: { bg: 'from-fuchsia-600/40 to-purple-600/30', border: 'border-fuchsia-500/70', icon: 'text-fuchsia-400', glow: 'rgba(192,38,211,0.5)' },
      shape: 'rounded-2xl',
    },
    gold: {
      client: { bg: 'from-amber-600/40 to-yellow-600/30', border: 'border-amber-500/70', icon: 'text-amber-400', glow: 'rgba(245,158,11,0.45)' },
      instructor: { bg: 'from-orange-600/40 to-amber-600/30', border: 'border-orange-500/70', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.45)' },
      admin: { bg: 'from-yellow-600/40 to-orange-600/30', border: 'border-yellow-500/70', icon: 'text-yellow-500', glow: 'rgba(234,179,8,0.45)' },
      shape: 'rounded-xl',
    },
    amoled: {
      client: { bg: 'from-white/25 to-gray-400/15', border: 'border-white/50', icon: 'text-white', glow: 'rgba(255,255,255,0.25)' },
      instructor: { bg: 'from-green-600/30 to-emerald-600/20', border: 'border-green-500/50', icon: 'text-green-400', glow: 'rgba(34,197,94,0.35)' },
      admin: { bg: 'from-blue-600/30 to-indigo-600/20', border: 'border-blue-500/50', icon: 'text-blue-400', glow: 'rgba(59,130,246,0.35)' },
      shape: 'rounded-lg',
    },
  };
  return styles[themeId] || styles.fire;
};

const PanelSelector: React.FC = () => {
  const navigate = useNavigate();
  const { role, profile, isLoading, signOut, session, license } = useAuth();
  const { playClickSound } = useAudio();
  const { themeConfig, currentTheme } = useTheme();
  const [redirecting, setRedirecting] = useState(false);
  const { src, blur } = useProgressiveImage(bgHomeOptimized);
  const { preloadData, preloadStatus } = useDataPreloader();
  const hasPreloadedRef = useRef(false);

  const themeStyles = useMemo(() => getThemePanelStyles(currentTheme), [currentTheme]);

  // Pré-carrega dados do dashboard durante o loading
  useEffect(() => {
    if (profile?.id && role && !hasPreloadedRef.current && navigator.onLine) {
      hasPreloadedRef.current = true;
      preloadData(profile.id, role).catch(() => {});
    }
  }, [profile?.id, role, preloadData]);

  // Calcula progresso direto sem animação lenta
  const progress = useMemo(() => {
    let p = 0;
    if (session) p += 25;
    if (profile) p += 25;
    if (role) p += 25;
    if (license || redirecting) p += 25;
    return p;
  }, [session, profile, role, license, redirecting]);

  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/');
      return;
    }

    if (!isLoading && role && role !== 'master') {
      setRedirecting(true);
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'instructor') {
        navigate('/instructor');
      } else {
        navigate('/client');
      }
    }
  }, [role, profile, isLoading, navigate]);

  const handlePanelSelect = (panel: PanelOption) => {
    playClickSound();
    navigate(panel.route);
  };

  const handleLogout = async () => {
    playClickSound();
    await signOut();
    navigate('/');
  };

  // Texto de status baseado no progresso e preload
  const statusText = useMemo(() => {
    if (redirecting) return 'Redirecionando...';
    if (progress < 25) return 'Iniciando sessão...';
    if (progress < 50) return 'Carregando perfil...';
    if (progress < 75) return 'Verificando permissões...';
    if (preloadStatus === 'loading') return 'Preparando dados...';
    return 'Validando licença...';
  }, [redirecting, progress, preloadStatus]);

  if (isLoading || redirecting) {
    return (
      <div 
        className="h-[100dvh] flex flex-col items-center justify-center bg-background"
        style={{
          backgroundImage: src ? `url(${src})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <AnimatedLogo size="md" showGlow />
          
          {/* Progress Bar com Percentual */}
          <div className="w-48 sm:w-64 flex flex-col items-center gap-2">
            <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-mono text-primary font-bold">
              {progress}%
            </span>
          </div>

          {/* Status Text */}
          <p className="text-sm text-muted-foreground animate-pulse">
            {statusText}
          </p>
          
          {/* Preload Indicator */}
          {preloadStatus === 'loading' && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-muted-foreground/70"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>Sincronizando dados offline...</span>
            </motion.div>
          )}
          
          {preloadStatus === 'done' && progress >= 75 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-xs text-green-500"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>Dados prontos</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-background"
      style={{
        backgroundImage: src ? `url(${src})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: blur ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s ease-out',
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Partículas temáticas animadas */}
      <ThemedParticles particleCount={25} />

      <div className="relative z-10 flex flex-col items-center px-4 w-full max-w-md">
        <AnimatedLogo size="md" showGlow />

        <h1 className="mt-4 text-xl font-bebas text-foreground tracking-wide">
          Olá, <span className="text-primary">{profile?.full_name || profile?.username}</span>
        </h1>

        <p className="text-xs text-muted-foreground mt-1 mb-6">
          Selecione o painel de acesso
        </p>

        {/* Panel buttons - Design limpo com ícones estilizados por tema */}
        <div className="flex items-center justify-center gap-6 w-full">
          {panels.map((panel, index) => {
            const Icon = panel.icon;
            const panelStyle = themeStyles[panel.id];
            return (
              <motion.button
                key={panel.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handlePanelSelect(panel)}
                className="relative flex flex-col items-center gap-3 p-4 bg-transparent transition-all duration-200 group"
              >
                {/* Icon container - tamanho aumentado com glow pulsante */}
                <motion.div 
                  className={cn(
                    'relative p-5 sm:p-6 md:p-7 border-2 transition-all duration-300',
                    `bg-gradient-to-br ${panelStyle.bg}`,
                    panelStyle.border,
                    themeStyles.shape,
                    'backdrop-blur-sm',
                    'group-hover:animate-pulse-glow'
                  )}
                  style={{
                    boxShadow: `0 6px 20px ${panelStyle.glow}`,
                  }}
                >
                  <Icon 
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-transform duration-300',
                      panelStyle.icon,
                      'group-hover:scale-110'
                    )} 
                    strokeWidth={1.8} 
                  />
                </motion.div>

                {/* Label */}
                <span className={cn(
                  'font-bebas text-xs sm:text-sm tracking-wider text-center',
                  panelStyle.icon,
                  'opacity-90',
                  themeConfig.fontWeight === 'extra-bold' ? 'font-black' : 
                  themeConfig.fontWeight === 'bold' ? 'font-bold' : 'font-medium'
                )}>
                  {panel.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} className="mr-1" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default PanelSelector;
