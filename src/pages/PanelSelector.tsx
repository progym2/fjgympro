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
    bgColor: 'bg-primary/20 hover:bg-primary/30',
    borderColor: 'border-primary/50 hover:border-primary',
    route: '/client',
  },
  {
    id: 'instructor',
    label: 'INSTRUTOR',
    icon: Dumbbell,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20 hover:bg-green-500/30',
    borderColor: 'border-green-500/50 hover:border-green-500',
    route: '/instructor',
  },
  {
    id: 'admin',
    label: 'GERENTE',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20 hover:bg-blue-500/30',
    borderColor: 'border-blue-500/50 hover:border-blue-500',
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
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${bgHome})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      <ParticlesBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatedLogo size="lg" showGlow />
        </motion.div>

        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-bebas text-foreground tracking-wider">
            Bem-vindo, <span className="text-primary">{profile?.full_name || profile?.username}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Como <span className="text-primary font-semibold">Master</span>, você pode acessar qualquer painel
          </p>
        </motion.div>

        {/* Panel Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl"
        >
          {panels.map((panel, index) => {
            const Icon = panel.icon;
            return (
              <motion.button
                key={panel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePanelSelect(panel)}
                className={`
                  flex flex-col items-center gap-4 p-6 sm:p-8 rounded-2xl
                  ${panel.bgColor} ${panel.borderColor}
                  border-2 backdrop-blur-md
                  transition-all duration-300 cursor-pointer
                  shadow-lg hover:shadow-xl
                `}
              >
                <motion.div
                  className={`p-4 rounded-full ${panel.bgColor} ${panel.color}`}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon size={40} />
                </motion.div>
                <span className={`text-xl font-bebas tracking-wider ${panel.color}`}>
                  PAINEL {panel.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-10"
        >
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={18} />
            Sair e voltar ao início
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PanelSelector;
