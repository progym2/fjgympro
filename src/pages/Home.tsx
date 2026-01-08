import React, { useState, useEffect, lazy, Suspense, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Shield, Info, Volume2, VolumeX } from 'lucide-react';

import DigitalClock from '@/components/DigitalClock';
import ThemedHomeButton from '@/components/ThemedHomeButton';
import AppFooter from '@/components/AppFooter';
import SimpleLogo from '@/components/SimpleLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

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

  const playPanelTransitionSound = useCallback((panel: 'client' | 'instructor' | 'admin') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sound characteristics for each panel
    const soundConfigs = {
      client: {
        startFreq: 600,
        endFreq: 300,
        type: 'sine' as OscillatorType,
        duration: 0.12,
        volume: 0.07
      },
      instructor: {
        startFreq: 900,
        endFreq: 400,
        type: 'triangle' as OscillatorType,
        duration: 0.15,
        volume: 0.06
      },
      admin: {
        startFreq: 1200,
        endFreq: 500,
        type: 'square' as OscillatorType,
        duration: 0.18,
        volume: 0.04
      }
    };
    
    const config = soundConfigs[panel];
    
    oscillator.frequency.setValueAtTime(config.startFreq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(config.endFreq, audioContext.currentTime + config.duration);
    
    gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
    
    oscillator.type = config.type;
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
  }, []);

  const handlePanelClick = useCallback((panel: 'client' | 'instructor' | 'admin') => {
    playClickSound();
    setSelectedPanel(panel);
    stopMusicImmediately();
    setIsExiting(true);
    
    // Haptic feedback on mobile devices
    if (navigator.vibrate) {
      const vibrationPatterns = {
        client: [30],
        instructor: [20, 30, 20],
        admin: [40, 20, 40]
      };
      navigator.vibrate(vibrationPatterns[panel]);
    }
    
    setTimeout(() => {
      playPanelTransitionSound(panel);
      setLoginDialogOpen(true);
      setIsExiting(false);
    }, 300);
  }, [playClickSound, stopMusicImmediately, playPanelTransitionSound]);

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
          backgroundPosition: 'center',
          filter: bgLoaded ? 'none' : 'blur(10px)',
          transform: bgLoaded ? 'scale(1)' : 'scale(1.05)',
        }}
      />
      {/* Overlay - gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />

      {/* Simple particles - lightweight - lazy loaded */}
      <Suspense fallback={null}>
        <SimpleParticles />
      </Suspense>

      {/* Content - centered and compact */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
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
          className="mt-4"
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

        {/* Panel Buttons - modern cards with staggered animation */}
        <div className="mt-10 flex gap-6 sm:gap-10 md:gap-14">
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

        {/* Footer inline */}
        <div className="mt-10">
          <AppFooter />
        </div>
      </div>

      {/* Fixed buttons - minimal */}
      <Suspense fallback={null}>
        <div className="fixed top-3 left-3 z-50">
          <SportThemeSelector compact />
        </div>
      </Suspense>

      <button
        onClick={handleAboutOpen}
        className="fixed top-3 right-3 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-all"
        aria-label="Sobre"
      >
        <Info size={18} />
      </button>

      <button
        onClick={handleToggleSfx}
        className={`fixed bottom-16 left-3 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-sm transition-all ${
          isSfxEnabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-white/50 hover:bg-white/10'
        }`}
        aria-label={isSfxEnabled ? 'Desativar sons' : 'Ativar sons'}
        title={isSfxEnabled ? 'Sons ativos' : 'Sons desativados'}
      >
        {isSfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
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
