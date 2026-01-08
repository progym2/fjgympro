import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedLogo from '@/components/AnimatedLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import bgHome from '@/assets/bg-home.png';

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
  const { role, profile, isLoading, signOut } = useAuth();
  const { playClickSound } = useAudio();
  const { themeConfig } = useTheme();
  const [redirecting, setRedirecting] = useState(false);

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
      const timer = setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'instructor') {
          navigate('/instructor');
        } else {
          navigate('/client');
        }
      }, 1000);
      return () => clearTimeout(timer);
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

  if (isLoading || redirecting) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-background"
      style={{
        backgroundImage: `url(${bgHome})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex flex-col items-center px-4 w-full max-w-md">
        <AnimatedLogo size="md" showGlow />

        <h1 className="mt-4 text-xl font-bebas text-foreground tracking-wide">
          Olá, <span className="text-primary">{profile?.full_name || profile?.username}</span>
        </h1>

        <p className="text-xs text-muted-foreground mt-1 mb-6">
          Selecione o painel de acesso
        </p>

        {/* Panel buttons - Cards maiores e temáticos */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {panels.map((panel) => {
            const Icon = panel.icon;
            const colors = getPanelColors(panel.id);
            return (
              <button
                key={panel.id}
                onClick={() => handlePanelSelect(panel)}
                className={cn(
                  'relative p-4 sm:p-5 bg-card/90 backdrop-blur-sm',
                  'flex flex-col items-center gap-3',
                  'transition-all duration-200 shadow-lg',
                  getCardShape(themeConfig.cardStyle),
                  getBorderStyle(themeConfig.cardStyle),
                  'hover:scale-[1.02] hover:shadow-xl',
                  'active:scale-[0.98] active:shadow-md',
                  `bg-gradient-to-br ${colors}`
                )}
              >
                {/* Icon container com fundo temático */}
                <div className={cn(
                  'relative p-3 sm:p-4 rounded-xl transition-colors',
                  themeColors.iconBg,
                  'border border-primary/10'
                )}>
                  <Icon 
                    className={cn(
                      'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
                      colors.split(' ').find(c => c.startsWith('text-'))
                    )} 
                    strokeWidth={2} 
                  />
                </div>

                {/* Label */}
                <span className={cn(
                  'font-bebas text-xs sm:text-sm tracking-wider text-center',
                  themeConfig.fontWeight === 'extra-bold' ? 'font-black' : 
                  themeConfig.fontWeight === 'bold' ? 'font-bold' : 'font-medium'
                )}>
                  {panel.label}
                </span>
              </button>
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
