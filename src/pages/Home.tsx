import React, { useState, useEffect, lazy, Suspense, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Info, Volume2, VolumeX, Play } from 'lucide-react';

import DigitalClock from '@/components/DigitalClock';
import ThemedHomeButton from '@/components/ThemedHomeButton';
import AppFooter from '@/components/AppFooter';
import SimpleLogo from '@/components/SimpleLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

// Background image
import bgHome from '@/assets/bg-home-optimized.webp';

// Lazy load heavy components
const LoginDialog = lazy(() => import('@/components/LoginDialog'));
const AboutDialog = lazy(() => import('@/components/AboutDialog'));
const SimpleParticles = lazy(() => import('@/components/SimpleParticles'));
const SportThemeSelector = lazy(() => import('@/components/SportThemeSelector'));
const MiniMusicPlayer = lazy(() => import('@/components/MiniMusicPlayer'));
const OfflineModeIndicator = lazy(() => import('@/components/OfflineModeIndicator'));


const Home: React.FC = memo(() => {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<'client' | 'instructor' | 'admin'>('client');
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();
  const { licenseExpired } = useAuth();
  const { playClickSound, setOnHomeScreen, setSplashComplete, stopMusicImmediately, tryAutoPlay, isSfxEnabled, toggleSfx } = useAudio();
  
  const { isLoaded: bgLoaded } = useProgressiveImage(bgHome);

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

  // Som simples de transição - apenas um clique suave
  const playPanelTransitionSound = useCallback(() => {
    playClickSound();
  }, [playClickSound]);

  const handlePanelClick = useCallback((panel: 'client' | 'instructor' | 'admin') => {
    setSelectedPanel(panel);
    stopMusicImmediately();
    setIsExiting(true);
    
    // Haptic feedback on mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([25]);
    }
    
    setTimeout(() => {
      setLoginDialogOpen(true);
      setIsExiting(false);
    }, 300);
  }, [stopMusicImmediately]);

  const handleLoginSuccess = useCallback((role: string) => {
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
  }, [navigate]);

  const handleAboutOpen = useCallback(() => setAboutDialogOpen(true), []);
  const handleLoginClose = useCallback(() => setLoginDialogOpen(false), []);
  const handleAboutClose = useCallback(() => setAboutDialogOpen(false), []);
  const handleToggleSfx = useCallback(() => { playClickSound(); toggleSfx(); }, [playClickSound, toggleSfx]);
  
  const handleReplayIntro = useCallback(() => {
    playClickSound();
    localStorage.removeItem('splashShown');
    window.location.reload();
  }, [playClickSound]);

  return (
    <div
      className="h-[100dvh] relative overflow-hidden bg-black"
      onClick={tryAutoPlay}
      onTouchStart={tryAutoPlay}
    >
      {/* Progressive background image */}
      <div 
        className="absolute inset-0 transition-all duration-500"
        style={{
          backgroundImage: `url(${bgHome})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: bgLoaded ? 'none' : 'blur(10px)',
          transform: bgLoaded ? 'scale(1)' : 'scale(1.05)',
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />

      {/* Simple particles - lightweight - lazy loaded */}
      <Suspense fallback={null}>
        <SimpleParticles />
      </Suspense>

      {/* Content - centered with better spacing for all screens */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 md:py-10 lg:py-12">
        {/* Logo section */}
        <div className="flex flex-col items-center flex-shrink-0">
          {/* Logo - with fade-in and pulse animation */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ 
              opacity: isExiting ? 0 : 1, 
              y: isExiting ? -30 : 0, 
              scale: isExiting ? 0.9 : 1 
            }}
            transition={{ duration: isExiting ? 0.25 : 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
                opacity: [1, 0.9, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <SimpleLogo size="lg" showGlow />
            </motion.div>
          </motion.div>

          {/* Clock - with delayed fade-in and exit animation */}
          <motion.div 
            className="mt-3 sm:mt-4 md:mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: isExiting ? 0 : 1, 
              y: isExiting ? -20 : 0 
            }}
            transition={{ 
              duration: isExiting ? 0.2 : 0.5, 
              delay: isExiting ? 0.05 : 0.15, 
              ease: [0.25, 0.46, 0.45, 0.94] 
            }}
          >
            <DigitalClock />
          </motion.div>
        </div>

        {/* Panel Buttons - centered with better distribution */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 md:gap-16 lg:gap-24 xl:gap-32 py-4 sm:py-6 md:py-8">
          {[
            { panel: 'client' as const, icon: User, label: 'CLIENTE', color: 'primary' as const },
            { panel: 'instructor' as const, icon: Dumbbell, label: 'INSTRUTOR', color: 'secondary' as const },
            { panel: 'admin' as const, icon: Shield, label: 'GERENTE', color: 'accent' as const },
          ].map((item, index) => (
            <motion.div
              key={item.panel}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ 
                opacity: isExiting ? 0 : 1, 
                y: isExiting ? 40 : 0, 
                scale: isExiting ? 0.85 : 1 
              }}
              transition={{
                duration: isExiting ? 0.25 : 0.5,
                delay: isExiting ? index * 0.05 : 0.35 + index * 0.12,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <ThemedHomeButton
                onClick={() => handlePanelClick(item.panel)}
                icon={item.icon}
                label={item.label}
                color={item.color}
              />
            </motion.div>
          ))}
        </div>
        
        {/* Footer - na parte inferior */}
        <div className="flex-shrink-0">
          <AppFooter />
        </div>
      </div>

      {/* Fixed buttons - Sport Theme */}
      <Suspense fallback={null}>
        <div className="fixed top-3 left-3 z-50 pt-safe">
          <SportThemeSelector compact />
        </div>
      </Suspense>

      <button
        onClick={handleAboutOpen}
        className="fixed top-3 right-3 z-50 p-2.5 rounded-xl backdrop-blur-sm transition-all pt-safe bg-black/40 text-white/70 hover:text-white hover:bg-black/60"
        aria-label="Sobre"
      >
        <Info size={18} />
      </button>

      <button
        onClick={handleToggleSfx}
        className={`fixed bottom-24 left-3 z-50 p-2.5 rounded-xl backdrop-blur-sm transition-all ${
          isSfxEnabled ? 'bg-black/40 text-emerald-400 hover:bg-emerald-500/20' : 'bg-black/40 text-white/50 hover:bg-white/10'
        }`}
        aria-label={isSfxEnabled ? 'Desativar sons' : 'Ativar sons'}
        title={isSfxEnabled ? 'Sons ativos' : 'Sons desativados'}
      >
        {isSfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      <button
        onClick={handleReplayIntro}
        className="fixed bottom-16 left-3 z-50 p-2.5 rounded-xl backdrop-blur-sm transition-all bg-black/40 text-white/70 hover:text-white hover:bg-black/60"
        aria-label="Ver intro novamente"
        title="Ver intro novamente"
      >
        <Play size={18} />
      </button>

      {/* Mini Music Player - lazy */}
      <Suspense fallback={null}>
        <MiniMusicPlayer />
      </Suspense>

      {/* Offline Mode Indicator - lazy */}
      <Suspense fallback={null}>
        <OfflineModeIndicator />
      </Suspense>

      {/* Dialogs - only render when open */}
      {loginDialogOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <LoginDialog
            isOpen={loginDialogOpen}
            onClose={handleLoginClose}
            onSuccess={handleLoginSuccess}
            panelType={selectedPanel}
          />
        </Suspense>
      )}
      
      {aboutDialogOpen && (
        <Suspense fallback={null}>
          <AboutDialog isOpen={aboutDialogOpen} onClose={handleAboutClose} />
        </Suspense>
      )}
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
