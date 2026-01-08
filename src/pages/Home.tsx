import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Info, Volume2, VolumeX } from 'lucide-react';

import DigitalClock from '@/components/DigitalClock';
import ThemedHomeButton from '@/components/ThemedHomeButton';
import AppFooter from '@/components/AppFooter';
import LoginDialog from '@/components/LoginDialog';
import AboutDialog from '@/components/AboutDialog';
import SimpleParticles from '@/components/SimpleParticles';
import SimpleLogo from '@/components/SimpleLogo';
import SportThemeSelector from '@/components/SportThemeSelector';
import MiniMusicPlayer from '@/components/MiniMusicPlayer';
import OfflineModeIndicator from '@/components/OfflineModeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';

import bgHome from '@/assets/bg-home.png';

const Home: React.FC = () => {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<'client' | 'instructor' | 'admin'>('client');

  const navigate = useNavigate();
  const { licenseExpired } = useAuth();
  const { playClickSound, setOnHomeScreen, setSplashComplete, stopMusicImmediately, tryAutoPlay, isSfxEnabled, toggleSfx } = useAudio();

  // Marcar que está na tela inicial
  useEffect(() => {
    setOnHomeScreen(true);
    setSplashComplete(true);
    
    return () => {
      setOnHomeScreen(false);
    };
  }, [setOnHomeScreen, setSplashComplete]);

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
    stopMusicImmediately();
    setLoginDialogOpen(true);
  };

  const handleLoginSuccess = (role: string) => {
    setLoginDialogOpen(false);

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

  return (
    <div
      className="h-[100dvh] relative overflow-hidden"
      onClick={tryAutoPlay}
      onTouchStart={tryAutoPlay}
      style={{
        backgroundImage: `url(${bgHome})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay - gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />

      {/* Simple particles - lightweight */}
      <SimpleParticles />

      {/* Content - centered and compact */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* Logo - simplified */}
        <SimpleLogo size="lg" showGlow />

        {/* Clock */}
        <div className="mt-4">
          <DigitalClock />
        </div>

        {/* Panel Buttons - modern cards */}
        <div className="mt-8 flex gap-3 sm:gap-4">
          <ThemedHomeButton onClick={() => handlePanelClick('client')} icon={User} label="CLIENTE" color="primary" />
          <ThemedHomeButton onClick={() => handlePanelClick('instructor')} icon={Dumbbell} label="INSTRUTOR" color="secondary" />
          <ThemedHomeButton onClick={() => handlePanelClick('admin')} icon={Shield} label="GERENTE" color="accent" />
        </div>

        {/* Footer inline */}
        <div className="mt-10">
          <AppFooter />
        </div>
      </div>

      {/* Fixed buttons - minimal */}
      <div className="fixed top-3 left-3 z-50">
        <SportThemeSelector compact />
      </div>

      <button
        onClick={() => setAboutDialogOpen(true)}
        className="fixed top-3 right-3 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-all"
        aria-label="Sobre"
      >
        <Info size={18} />
      </button>

      <button
        onClick={() => { playClickSound(); toggleSfx(); }}
        className={`fixed bottom-16 left-3 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-sm transition-all ${
          isSfxEnabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-white/50 hover:bg-white/10'
        }`}
        aria-label={isSfxEnabled ? 'Desativar sons' : 'Ativar sons'}
        title={isSfxEnabled ? 'Sons ativos' : 'Sons desativados'}
      >
        {isSfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {/* Mini Music Player */}
      <MiniMusicPlayer />

      {/* Offline Mode Indicator */}
      <OfflineModeIndicator />

      {/* Dialogs */}
      <LoginDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onSuccess={handleLoginSuccess}
        panelType={selectedPanel}
      />
      <AboutDialog isOpen={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />
    </div>
  );
};

export default Home;
