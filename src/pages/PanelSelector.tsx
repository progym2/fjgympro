import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Dumbbell, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import AnimatedLogo from '@/components/AnimatedLogo';
import ParticlesBackground from '@/components/ParticlesBackground';
import { Button } from '@/components/ui/button';
import bgHome from '@/assets/bg-home.png';

interface PanelOption {
  id: 'client' | 'instructor' | 'admin';
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  route: string;
}

const panels: PanelOption[] = [
  {
    id: 'client',
    label: 'CLIENTE',
    icon: User,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30 hover:border-primary',
    route: '/client',
  },
  {
    id: 'instructor',
    label: 'INSTRUTOR',
    icon: Dumbbell,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30 hover:border-green-500',
    route: '/instructor',
  },
  {
    id: 'admin',
    label: 'GERENTE',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30 hover:border-blue-500',
    route: '/admin',
  },
];

const PanelSelector: React.FC = () => {
  const navigate = useNavigate();
  const { role, profile, isLoading, signOut } = useAuth();
  const { playClickSound } = useAudio();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Se não estiver logado, voltar para home
    if (!isLoading && !profile) {
      navigate('/');
      return;
    }

    // Se não for master, redirecionar automaticamente para o painel correspondente
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
      }, 1000); // Pequeno delay para mostrar feedback visual
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

  // Loading state
  if (isLoading || redirecting) {
    const roleLabel = role === 'admin' ? 'Gerente' : role === 'instructor' ? 'Instrutor' : 'Cliente';
    
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundImage: `url(${bgHome})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <ParticlesBackground />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-6 p-8"
        >
          <AnimatedLogo size="lg" showGlow />
          <div className="flex items-center gap-3 text-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg font-medium">
              {redirecting 
                ? `Redirecionando para o Painel de ${roleLabel}...`
                : 'Carregando...'}
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Master user - show panel selection
  return (
    <div
      className="min-h-screen h-[100dvh] flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${bgHome})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <ParticlesBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4">
        {/* Logo - smaller */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <AnimatedLogo size="md" showGlow />
        </motion.div>

        {/* Welcome Message - compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <h1 className="text-xl sm:text-2xl font-bebas text-foreground tracking-wider">
            Olá, <span className="text-primary">{profile?.full_name || profile?.username}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um painel para acessar
          </p>
        </motion.div>

        {/* Panel Selection - refined buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-3"
        >
          {panels.map((panel, index) => {
            const Icon = panel.icon;
            return (
              <motion.button
                key={panel.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 0.3 + index * 0.08, 
                  duration: 0.3,
                  ease: [0.23, 1, 0.32, 1]
                }}
                whileHover={{ 
                  scale: 1.04,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePanelSelect(panel)}
                className={`
                  group relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg
                  bg-card/70 backdrop-blur-md
                  ${panel.borderColor}
                  border transition-all duration-200 cursor-pointer
                  shadow-sm hover:shadow-md
                `}
              >
                {/* Icon */}
                <div
                  className={`p-1.5 rounded-md ${panel.bgColor} ${panel.color} transition-all duration-200 group-hover:scale-110`}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>
                
                {/* Label */}
                <span className={`text-xs sm:text-sm font-bebas tracking-wider ${panel.color}`}>
                  {panel.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Logout Button - subtle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="mt-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-card/30"
          >
            <ArrowLeft size={14} />
            Sair
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PanelSelector;
