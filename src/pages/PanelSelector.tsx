import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedLogo from '@/components/AnimatedLogo';
import ThemedParticles from '@/components/ThemedParticles';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import { useDataPreloader } from '@/hooks/useDataPreloader';
import bgHomeOptimized from '@/assets/bg-home-optimized.webp';

// Animação de entrada para os cards
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

// Glow colors por tema
const getGlowColor = (themeId: string, panelId: string): string => {
  const glowMap: Record<string, Record<string, string>> = {
    fire: { client: 'rgba(249, 115, 22, 0.5)', instructor: 'rgba(234, 179, 8, 0.5)', admin: 'rgba(220, 38, 38, 0.5)' },
    ocean: { client: 'rgba(6, 182, 212, 0.5)', instructor: 'rgba(20, 184, 166, 0.5)', admin: 'rgba(59, 130, 246, 0.5)' },
    forest: { client: 'rgba(34, 197, 94, 0.5)', instructor: 'rgba(132, 204, 22, 0.5)', admin: 'rgba(16, 185, 129, 0.5)' },
    lightning: { client: 'rgba(250, 204, 21, 0.5)', instructor: 'rgba(245, 158, 11, 0.5)', admin: 'rgba(249, 115, 22, 0.5)' },
    galaxy: { client: 'rgba(168, 85, 247, 0.5)', instructor: 'rgba(217, 70, 239, 0.5)', admin: 'rgba(139, 92, 246, 0.5)' },
    iron: { client: 'rgba(148, 163, 184, 0.4)', instructor: 'rgba(161, 161, 170, 0.4)', admin: 'rgba(107, 114, 128, 0.4)' },
    blood: { client: 'rgba(220, 38, 38, 0.5)', instructor: 'rgba(225, 29, 72, 0.5)', admin: 'rgba(185, 28, 28, 0.5)' },
    neon: { client: 'rgba(236, 72, 153, 0.6)', instructor: 'rgba(34, 211, 238, 0.6)', admin: 'rgba(192, 38, 211, 0.6)' },
    gold: { client: 'rgba(234, 179, 8, 0.5)', instructor: 'rgba(245, 158, 11, 0.5)', admin: 'rgba(249, 115, 22, 0.5)' },
    amoled: { client: 'rgba(var(--primary), 0.4)', instructor: 'rgba(34, 197, 94, 0.4)', admin: 'rgba(59, 130, 246, 0.4)' },
    default: { client: 'rgba(var(--primary), 0.4)', instructor: 'rgba(34, 197, 94, 0.4)', admin: 'rgba(59, 130, 246, 0.4)' },
  };
  return glowMap[themeId]?.[panelId] || glowMap.default[panelId];
};

interface PanelOption {
  id: 'client' | 'instructor' | 'admin';
  label: string;
  icon: React.ElementType;
  route: string;
}

const panels: PanelOption[] = [
  {
    id: 'client',
    label: 'CLIENTE',
    icon: User,
    route: '/client',
  },
  {
    id: 'instructor',
    label: 'INSTRUTOR',
    icon: Dumbbell,
    route: '/instructor',
  },
  {
    id: 'admin',
    label: 'GERENTE',
    icon: Shield,
    route: '/admin',
  },
];

// Estilos de card baseados no tema
const getCardShape = (style: string): string => {
  switch (style) {
    case 'sharp':
      return 'rounded-sm';
    case 'hexagonal':
      return 'rounded-lg';
    case 'beveled':
      return 'rounded-xl';
    case 'organic':
      return 'rounded-[1.5rem]';
    default:
      return 'rounded-xl';
  }
};

const getBorderStyle = (style: string): string => {
  switch (style) {
    case 'sharp':
      return 'border-l-4 border-l-primary border-y border-r border-border/50';
    case 'beveled':
      return 'border-2 border-primary/30';
    case 'hexagonal':
      return 'border border-primary/20';
    default:
      return 'border border-border/50';
  }
};

const PanelSelector: React.FC = () => {
  const navigate = useNavigate();
  const { role, profile, isLoading, signOut, session, license } = useAuth();
  const { playClickSound } = useAudio();
  const { themeConfig } = useTheme();
  const [redirecting, setRedirecting] = useState(false);
  const { src, blur } = useProgressiveImage(bgHomeOptimized);
  const { preloadData } = useDataPreloader();
  const hasPreloadedRef = useRef(false);

  // Pré-carrega dados do dashboard durante o loading
  useEffect(() => {
    if (profile?.id && role && !hasPreloadedRef.current && navigator.onLine) {
      hasPreloadedRef.current = true;
      // Inicia preload imediatamente em background
      preloadData(profile.id, role).catch(() => {
        // Ignora erros de preload - não é crítico
      });
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

  // Cores dinâmicas baseadas no tema
  const themeColors = useMemo(() => {
    switch (themeConfig.id) {
      case 'fire':
        return {
          client: 'from-orange-500/30 to-red-600/20 border-orange-500/40 text-orange-400',
          instructor: 'from-yellow-500/30 to-orange-500/20 border-yellow-500/40 text-yellow-400',
          admin: 'from-red-600/30 to-orange-700/20 border-red-600/40 text-red-400',
          iconBg: 'bg-gradient-to-br from-orange-500/20 to-red-600/10',
        };
      case 'ocean':
        return {
          client: 'from-cyan-500/30 to-blue-600/20 border-cyan-500/40 text-cyan-400',
          instructor: 'from-teal-500/30 to-cyan-500/20 border-teal-500/40 text-teal-400',
          admin: 'from-blue-600/30 to-indigo-600/20 border-blue-600/40 text-blue-400',
          iconBg: 'bg-gradient-to-br from-cyan-500/20 to-blue-600/10',
        };
      case 'forest':
        return {
          client: 'from-green-500/30 to-emerald-600/20 border-green-500/40 text-green-400',
          instructor: 'from-lime-500/30 to-green-500/20 border-lime-500/40 text-lime-400',
          admin: 'from-emerald-600/30 to-teal-600/20 border-emerald-600/40 text-emerald-400',
          iconBg: 'bg-gradient-to-br from-green-500/20 to-emerald-600/10',
        };
      case 'lightning':
        return {
          client: 'from-yellow-400/30 to-amber-500/20 border-yellow-400/40 text-yellow-400',
          instructor: 'from-amber-500/30 to-orange-500/20 border-amber-500/40 text-amber-400',
          admin: 'from-orange-500/30 to-yellow-600/20 border-orange-500/40 text-orange-400',
          iconBg: 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10',
        };
      case 'galaxy':
        return {
          client: 'from-purple-500/30 to-violet-600/20 border-purple-500/40 text-purple-400',
          instructor: 'from-fuchsia-500/30 to-purple-500/20 border-fuchsia-500/40 text-fuchsia-400',
          admin: 'from-violet-600/30 to-indigo-600/20 border-violet-600/40 text-violet-400',
          iconBg: 'bg-gradient-to-br from-purple-500/20 to-violet-600/10',
        };
      case 'iron':
        return {
          client: 'from-slate-400/30 to-zinc-500/20 border-slate-400/40 text-slate-300',
          instructor: 'from-zinc-500/30 to-slate-600/20 border-zinc-500/40 text-zinc-300',
          admin: 'from-gray-500/30 to-slate-600/20 border-gray-500/40 text-gray-300',
          iconBg: 'bg-gradient-to-br from-slate-400/20 to-zinc-600/10',
        };
      case 'blood':
        return {
          client: 'from-red-600/30 to-rose-700/20 border-red-600/40 text-red-400',
          instructor: 'from-rose-600/30 to-red-700/20 border-rose-600/40 text-rose-400',
          admin: 'from-red-700/30 to-rose-800/20 border-red-700/40 text-red-500',
          iconBg: 'bg-gradient-to-br from-red-600/20 to-rose-800/10',
        };
      case 'neon':
        return {
          client: 'from-pink-500/30 to-fuchsia-600/20 border-pink-500/40 text-pink-400',
          instructor: 'from-cyan-400/30 to-blue-500/20 border-cyan-400/40 text-cyan-400',
          admin: 'from-fuchsia-600/30 to-purple-600/20 border-fuchsia-600/40 text-fuchsia-400',
          iconBg: 'bg-gradient-to-br from-pink-500/20 to-fuchsia-600/10',
        };
      case 'gold':
        return {
          client: 'from-yellow-500/30 to-amber-600/20 border-yellow-500/40 text-yellow-400',
          instructor: 'from-amber-500/30 to-orange-500/20 border-amber-500/40 text-amber-400',
          admin: 'from-orange-500/30 to-yellow-600/20 border-orange-500/40 text-orange-400',
          iconBg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/10',
        };
      case 'amoled':
        return {
          client: 'from-primary/30 to-primary/10 border-primary/40 text-primary',
          instructor: 'from-green-500/30 to-emerald-500/10 border-green-500/40 text-green-400',
          admin: 'from-blue-500/30 to-indigo-500/10 border-blue-500/40 text-blue-400',
          iconBg: 'bg-gradient-to-br from-primary/20 to-primary/5',
        };
      default:
        return {
          client: 'from-primary/30 to-primary/10 border-primary/40 text-primary',
          instructor: 'from-green-500/30 to-emerald-500/10 border-green-500/40 text-green-400',
          admin: 'from-blue-500/30 to-indigo-500/10 border-blue-500/40 text-blue-400',
          iconBg: 'bg-gradient-to-br from-primary/20 to-primary/10',
        };
    }
  }, [themeConfig.id]);

  const getPanelColors = (panelId: string) => {
    return themeColors[panelId as keyof typeof themeColors] || themeColors.client;
  };

  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/');
      return;
    }

    if (!isLoading && role && role !== 'master') {
      setRedirecting(true);
      // Redirecionamento imediato - sem delay
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

  // Texto de status baseado no progresso
  const statusText = useMemo(() => {
    if (redirecting) return 'Redirecionando...';
    if (progress < 25) return 'Iniciando sessão...';
    if (progress < 50) return 'Carregando perfil...';
    if (progress < 75) return 'Verificando permissões...';
    return 'Validando licença...';
  }, [redirecting, progress]);

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
        <div className="relative z-10 flex flex-col items-center gap-6">
          <AnimatedLogo size="md" showGlow />
          
          {/* Progress Bar com Percentual */}
          <div className="w-48 sm:w-64 flex flex-col items-center gap-2">
            <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
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
          
          <p className="text-sm text-muted-foreground animate-pulse">
            {statusText}
          </p>
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

        {/* Panel buttons - Cards maiores e temáticos com animação */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {panels.map((panel, index) => {
            const Icon = panel.icon;
            const colors = getPanelColors(panel.id);
            const glowColor = getGlowColor(themeConfig.id, panel.id);
            return (
              <motion.button
                key={panel.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: `0 0 25px ${glowColor}, 0 0 50px ${glowColor}`,
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePanelSelect(panel)}
                className={cn(
                  'relative p-4 sm:p-5 bg-card/90 backdrop-blur-sm',
                  'flex flex-col items-center gap-3',
                  'transition-colors duration-200 shadow-lg',
                  getCardShape(themeConfig.cardStyle),
                  getBorderStyle(themeConfig.cardStyle),
                  `bg-gradient-to-br ${colors}`
                )}
                style={{
                  boxShadow: `0 4px 20px ${glowColor.replace('0.5', '0.2').replace('0.4', '0.15').replace('0.6', '0.25')}`,
                }}
              >
                {/* Icon container com fundo temático */}
                <motion.div 
                  className={cn(
                    'relative p-3 sm:p-4 rounded-xl transition-colors',
                    themeColors.iconBg,
                    'border border-primary/10'
                  )}
                  whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.3 } }}
                >
                  <Icon 
                    className={cn(
                      'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
                      colors.split(' ').find(c => c.startsWith('text-'))
                    )} 
                    strokeWidth={2} 
                  />
                </motion.div>

                {/* Label */}
                <span className={cn(
                  'font-bebas text-xs sm:text-sm tracking-wider text-center',
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
