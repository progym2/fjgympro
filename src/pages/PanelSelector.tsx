import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import AnimatedLogo from '@/components/AnimatedLogo';
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
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Master user - show panel selection
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

      {/* Content - compact */}
      <div className="relative z-10 flex flex-col items-center px-4">
        <AnimatedLogo size="md" showGlow />

        <h1 className="mt-4 text-lg font-bebas text-foreground">
          Olá, <span className="text-primary">{profile?.full_name || profile?.username}</span>
        </h1>

        {/* Panel buttons */}
        <div className="mt-4 flex gap-2">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                onClick={() => handlePanelSelect(panel)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 border ${panel.borderColor}`}
              >
                <Icon size={16} className={panel.color} />
                <span className={`text-xs font-bebas ${panel.color}`}>{panel.label}</span>
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-6 text-xs text-muted-foreground"
        >
          <ArrowLeft size={14} className="mr-1" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default PanelSelector;
