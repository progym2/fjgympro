import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Info, Search } from 'lucide-react';

import SplashScreen from '@/components/SplashScreen';
import DigitalClock from '@/components/DigitalClock';
import GymButton from '@/components/GymButton';
import AppFooter from '@/components/AppFooter';
import LoginDialog from '@/components/LoginDialog';
import AboutDialog from '@/components/AboutDialog';
import ParticlesBackground from '@/components/ParticlesBackground';
import AnimatedLogo from '@/components/AnimatedLogo';
import AudioVisualizer from '@/components/AudioVisualizer';
import SportThemeSelector from '@/components/SportThemeSelector';
import MiniMusicPlayer from '@/components/MiniMusicPlayer';
import HoverEffectsToggle from '@/components/HoverEffectsToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';

import bgHome from '@/assets/bg-home.png';

// Chave para persistir se é primeira visita (localStorage = permanente)
const FIRST_VISIT_KEY = 'francgym_first_visit_complete';

const Home: React.FC = () => {
  // Splash só aparece na PRIMEIRA visita do dispositivo (localStorage)
  const [showSplash, setShowSplash] = useState(() => {
    return !localStorage.getItem(FIRST_VISIT_KEY);
  });
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<'client' | 'instructor' | 'admin'>('client');

  const navigate = useNavigate();
  const { licenseExpired } = useAuth();
  const { playClickSound, setOnHomeScreen, setSplashComplete, stopMusicImmediately, tryAutoPlay } = useAudio();

  // Marcar que está na tela inicial
  useEffect(() => {
    setOnHomeScreen(true);
    
    // Se não tem splash, marcar como completo imediatamente
    if (!showSplash) {
      setSplashComplete(true);
    }
    
    return () => {
      setOnHomeScreen(false);
    };
  }, [setOnHomeScreen, setSplashComplete, showSplash]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setSplashComplete(true);
    // Marca que a primeira visita foi concluída (permanente)
    localStorage.setItem(FIRST_VISIT_KEY, 'true');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLoginDialogOpen(false);
        setAboutDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (licenseExpired) {
      navigate('/license-expired');
    }
  }, [licenseExpired, navigate]);

  const handlePanelClick = (panel: 'client' | 'instructor' | 'admin') => {
    playClickSound();
    setSelectedPanel(panel);
    // Parar música imediatamente ao abrir login
    stopMusicImmediately();
    setLoginDialogOpen(true);
  };

  const handleLoginSuccess = (role: string) => {
    setLoginDialogOpen(false);

    // Navegar diretamente para o painel correspondente
    if (role === 'master') {
      navigate('/select-panel');
    } else if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'instructor') {
      navigate('/instructor');
    } else {
      navigate('/client');
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div
      className="h-screen h-[100dvh] relative overflow-hidden"
      onClick={tryAutoPlay}
      onTouchStart={tryAutoPlay}
      style={{
        backgroundImage: `url(${bgHome})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Animated Particles */}
      <ParticlesBackground />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col px-3 sm:px-4 overflow-hidden safe-area-inset">
        {/* Header with Logo */}
        <header className="pt-3 sm:pt-4 md:pt-6 flex-shrink-0">
          <div className="flex justify-center">
            <AnimatedLogo size="xl" showGlow />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 md:gap-8 py-2 sm:py-4">
          {/* Digital Clock */}
          <DigitalClock />

          {/* Panel Buttons */}
          <div className="flex flex-wrap justify-center items-end gap-3 sm:gap-5 md:gap-8 mt-2 sm:mt-4">
            <GymButton onClick={() => handlePanelClick('client')} icon={User} label="CLIENTE" color="primary" />
            <GymButton onClick={() => handlePanelClick('instructor')} icon={Dumbbell} label="INSTRUTOR" color="secondary" />
            <GymButton onClick={() => handlePanelClick('admin')} icon={Shield} label="GERENTE" color="accent" />
          </div>
        </main>

        {/* Theme Selector - top left */}
        <div className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50">
          <SportThemeSelector compact />
        </div>

        {/* Consulta Aluno Button - bottom left */}
        <button
          onClick={() => { playClickSound(); navigate('/consulta-aluno'); }}
          className="fixed bottom-20 left-3 sm:bottom-24 sm:left-4 z-50 p-2 sm:p-2.5 rounded-full bg-card/40 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-green-500 hover:border-green-500/50 transition-all shadow-md hover:scale-105 active:scale-95"
          aria-label="Consultar aluno"
        >
          <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="sr-only">Consultar Aluno</span>
        </button>

        {/* About Button - discreet corner */}
        <button
          onClick={() => setAboutDialogOpen(true)}
          className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-full bg-card/40 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all shadow-md hover:scale-105 active:scale-95"
          aria-label="Sobre o aplicativo"
        >
          <Info size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="sr-only">Sobre o Aplicativo</span>
        </button>

        {/* Hover Effects Toggle - bottom left */}
        <HoverEffectsToggle />

        {/* Mini Music Player - above footer */}
        <MiniMusicPlayer />

        {/* Footer */}
        <AppFooter />
      </div>

      {/* Dialogs */}
      <LoginDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onSuccess={handleLoginSuccess}
        panelType={selectedPanel}
      />
      <AboutDialog isOpen={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />

      {/* Audio Visualizer */}
      <AudioVisualizer />
    </div>
  );
};

export default Home;

