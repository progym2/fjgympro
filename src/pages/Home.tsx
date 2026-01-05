import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Info, Volume2, VolumeX } from 'lucide-react';

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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Particles - reduced */}
      <ParticlesBackground />

      {/* Content - centered and compact */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <AnimatedLogo size="lg" showGlow />

        {/* Clock */}
        <div className="mt-4">
          <DigitalClock />
        </div>

        {/* Panel Buttons - compact row */}
        <div className="mt-6 flex gap-3 sm:gap-4">
          <GymButton onClick={() => handlePanelClick('client')} icon={User} label="CLIENTE" color="primary" />
          <GymButton onClick={() => handlePanelClick('instructor')} icon={Dumbbell} label="INSTRUTOR" color="secondary" />
          <GymButton onClick={() => handlePanelClick('admin')} icon={Shield} label="GERENTE" color="accent" />
        </div>

        {/* Footer inline */}
        <div className="mt-8">
          <AppFooter />
        </div>
      </div>

      {/* Fixed buttons - minimal */}
      <div className="fixed top-3 left-3 z-50">
        <SportThemeSelector compact />
      </div>

      <button
        onClick={() => setAboutDialogOpen(true)}
        className="fixed top-3 right-3 z-50 p-2 rounded-full bg-black/40 text-white/70 hover:text-white"
        aria-label="Sobre"
      >
        <Info size={16} />
      </button>

      <button
        onClick={() => { playClickSound(); toggleSfx(); }}
        className={`fixed bottom-16 left-3 z-50 p-2 rounded-full bg-black/40 transition-colors ${
          isSfxEnabled ? 'text-green-400' : 'text-white/50'
        }`}
        aria-label={isSfxEnabled ? 'Desativar sons' : 'Ativar sons'}
        title={isSfxEnabled ? 'Sons de hover ativos' : 'Sons de hover desativados'}
      >
        {isSfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* Mini Music Player */}
      <MiniMusicPlayer />

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
