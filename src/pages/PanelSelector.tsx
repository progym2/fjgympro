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
const getThemePanelStyles = (themeId: SportTheme) => {
  const styles: Record<SportTheme, {
    client: { bg: string; border: string; icon: string; glow: string };
    instructor: { bg: string; border: string; icon: string; glow: string };
    admin: { bg: string; border: string; icon: string; glow: string };
    shape: string;
  }> = {
    fire: {
      client: { bg: 'from-orange-500/25 to-yellow-500/10', border: 'border-orange-500/40', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.4)' },
      instructor: { bg: 'from-yellow-500/25 to-amber-500/10', border: 'border-yellow-500/40', icon: 'text-yellow-400', glow: 'rgba(234,179,8,0.4)' },
      admin: { bg: 'from-red-500/25 to-orange-600/10', border: 'border-red-500/40', icon: 'text-red-400', glow: 'rgba(220,38,38,0.4)' },
      shape: 'rounded-xl',
    },
    ocean: {
      client: { bg: 'from-cyan-500/25 to-blue-500/10', border: 'border-cyan-500/40', icon: 'text-cyan-400', glow: 'rgba(6,182,212,0.4)' },
      instructor: { bg: 'from-teal-500/25 to-cyan-500/10', border: 'border-teal-500/40', icon: 'text-teal-400', glow: 'rgba(20,184,166,0.4)' },
      admin: { bg: 'from-blue-500/25 to-indigo-500/10', border: 'border-blue-500/40', icon: 'text-blue-400', glow: 'rgba(59,130,246,0.4)' },
      shape: 'rounded-2xl',
    },
    forest: {
      client: { bg: 'from-green-500/25 to-emerald-500/10', border: 'border-green-500/40', icon: 'text-green-400', glow: 'rgba(34,197,94,0.4)' },
      instructor: { bg: 'from-lime-500/25 to-green-500/10', border: 'border-lime-500/40', icon: 'text-lime-400', glow: 'rgba(132,204,22,0.4)' },
      admin: { bg: 'from-emerald-500/25 to-teal-500/10', border: 'border-emerald-500/40', icon: 'text-emerald-400', glow: 'rgba(16,185,129,0.4)' },
      shape: 'rounded-xl',
    },
    lightning: {
      client: { bg: 'from-yellow-400/25 to-amber-400/10', border: 'border-yellow-400/40', icon: 'text-yellow-400', glow: 'rgba(250,204,21,0.4)' },
      instructor: { bg: 'from-amber-500/25 to-orange-400/10', border: 'border-amber-500/40', icon: 'text-amber-400', glow: 'rgba(245,158,11,0.4)' },
      admin: { bg: 'from-orange-500/25 to-yellow-500/10', border: 'border-orange-500/40', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.4)' },
      shape: 'rounded-lg',
    },
    galaxy: {
      client: { bg: 'from-purple-500/25 to-violet-500/10', border: 'border-purple-500/40', icon: 'text-purple-400', glow: 'rgba(168,85,247,0.4)' },
      instructor: { bg: 'from-fuchsia-500/25 to-purple-500/10', border: 'border-fuchsia-500/40', icon: 'text-fuchsia-400', glow: 'rgba(217,70,239,0.4)' },
      admin: { bg: 'from-violet-500/25 to-indigo-500/10', border: 'border-violet-500/40', icon: 'text-violet-400', glow: 'rgba(139,92,246,0.4)' },
      shape: 'rounded-3xl',
    },
    iron: {
      client: { bg: 'from-slate-400/25 to-zinc-500/10', border: 'border-slate-400/40', icon: 'text-slate-300', glow: 'rgba(148,163,184,0.3)' },
      instructor: { bg: 'from-zinc-500/25 to-gray-500/10', border: 'border-zinc-500/40', icon: 'text-zinc-300', glow: 'rgba(161,161,170,0.3)' },
      admin: { bg: 'from-gray-500/25 to-slate-600/10', border: 'border-gray-500/40', icon: 'text-gray-300', glow: 'rgba(107,114,128,0.3)' },
      shape: 'rounded-md',
    },
    blood: {
      client: { bg: 'from-red-600/25 to-rose-600/10', border: 'border-red-600/40', icon: 'text-red-400', glow: 'rgba(220,38,38,0.4)' },
      instructor: { bg: 'from-rose-600/25 to-red-600/10', border: 'border-rose-600/40', icon: 'text-rose-400', glow: 'rgba(225,29,72,0.4)' },
      admin: { bg: 'from-red-700/25 to-rose-700/10', border: 'border-red-700/40', icon: 'text-red-500', glow: 'rgba(185,28,28,0.4)' },
      shape: 'rounded-xl',
    },
    neon: {
      client: { bg: 'from-pink-500/25 to-fuchsia-500/10', border: 'border-pink-500/50', icon: 'text-pink-400', glow: 'rgba(236,72,153,0.5)' },
      instructor: { bg: 'from-cyan-400/25 to-blue-500/10', border: 'border-cyan-400/50', icon: 'text-cyan-400', glow: 'rgba(34,211,238,0.5)' },
      admin: { bg: 'from-fuchsia-500/25 to-purple-500/10', border: 'border-fuchsia-500/50', icon: 'text-fuchsia-400', glow: 'rgba(192,38,211,0.5)' },
      shape: 'rounded-2xl',
    },
    gold: {
      client: { bg: 'from-yellow-500/25 to-amber-500/10', border: 'border-yellow-500/40', icon: 'text-yellow-400', glow: 'rgba(234,179,8,0.4)' },
      instructor: { bg: 'from-amber-500/25 to-orange-500/10', border: 'border-amber-500/40', icon: 'text-amber-400', glow: 'rgba(245,158,11,0.4)' },
      admin: { bg: 'from-orange-500/25 to-yellow-600/10', border: 'border-orange-500/40', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.4)' },
      shape: 'rounded-xl',
    },
    amoled: {
      client: { bg: 'from-white/15 to-gray-500/5', border: 'border-white/30', icon: 'text-white', glow: 'rgba(255,255,255,0.2)' },
      instructor: { bg: 'from-green-500/20 to-emerald-500/5', border: 'border-green-500/30', icon: 'text-green-400', glow: 'rgba(34,197,94,0.3)' },
      admin: { bg: 'from-blue-500/20 to-indigo-500/5', border: 'border-blue-500/30', icon: 'text-blue-400', glow: 'rgba(59,130,246,0.3)' },
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
                {/* Icon container com estilo do tema e glow pulsante */}
                <motion.div 
                  className={cn(
                    'relative p-4 sm:p-5 border-2 transition-all duration-300',
                    `bg-gradient-to-br ${panelStyle.bg}`,
                    panelStyle.border,
                    themeStyles.shape,
                    'backdrop-blur-sm',
                    'group-hover:animate-pulse-glow'
                  )}
                  style={{
                    boxShadow: `0 4px 15px ${panelStyle.glow}`,
                  }}
                >
                  <Icon 
                    className={cn(
                      'w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300',
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
