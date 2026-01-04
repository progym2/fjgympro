import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

// APENAS as 3 músicas enviadas pelo usuário
const MUSIC_TRACKS = [
  '/audio/peso-neon.mp3',
  '/audio/peso-do-ritmo.mp3',
  '/audio/peso-do-ritmo-1.mp3',
];

const MUSIC_VOLUME = 0.15; // Volume baixo
const FADE_DURATION = 2000; // 2 segundos de fade
const SFX_VOLUME = 0.5; // Volume para efeitos sonoros (aumentado)

interface AudioContextType {
  isMusicPlaying: boolean;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  isOnHomeScreen: boolean;
  isSplashComplete: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  setOnHomeScreen: (value: boolean) => void;
  setSplashComplete: (value: boolean) => void;
  // Funções de efeitos sonoros - só funcionam fora da tela inicial
  playClickSound: () => void;
  playNotificationSound: () => void;
  playSuccessSound: () => void;
  playTimerSound: () => void;
  playTickSound: () => void;
  playCountdownBeep: () => void;
}

const AudioContextData = createContext<AudioContextType | undefined>(undefined);

const STORAGE_KEY = 'gym_music_enabled';
const SFX_STORAGE_KEY = 'gym_sfx_enabled';

// Singleton AudioContext para melhor performance e compatibilidade
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    return sharedAudioContext;
  } catch (e) {
    console.log('AudioContext not available');
    return null;
  }
};

// Criar sons sintetizados em vez de carregar arquivos
const createSinisterClick = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 0.08);
  
  gainNode.gain.setValueAtTime(SFX_VOLUME, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const createNotificationSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(550, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(SFX_VOLUME * 0.8, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.35);
};

const createSuccessSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
  oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
  oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
  
  gainNode.gain.setValueAtTime(SFX_VOLUME, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
};

const createTimerSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  // Primeiro beep
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();
  osc1.connect(gain1);
  gain1.connect(audioContext.destination);
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(880, audioContext.currentTime);
  gain1.gain.setValueAtTime(SFX_VOLUME * 0.6, audioContext.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  osc1.start(audioContext.currentTime);
  osc1.stop(audioContext.currentTime + 0.1);
  
  // Segundo beep
  const osc2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  osc2.connect(gain2);
  gain2.connect(audioContext.destination);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(1100, audioContext.currentTime + 0.15);
  gain2.gain.setValueAtTime(SFX_VOLUME * 0.7, audioContext.currentTime + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  osc2.start(audioContext.currentTime + 0.15);
  osc2.stop(audioContext.currentTime + 0.3);
};

// Som de tick para cronômetro
const createTickSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(SFX_VOLUME * 0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.05);
};

// Som de beep para contagem regressiva
const createCountdownBeep = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
  
  gainNode.gain.setValueAtTime(SFX_VOLUME * 0.6, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getStoredPreference = (): boolean => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  };

  const getSfxStoredPreference = (): boolean => {
    const stored = localStorage.getItem(SFX_STORAGE_KEY);
    return stored !== 'false'; // Default to true
  };

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(getStoredPreference);
  const [isSfxEnabled, setIsSfxEnabled] = useState(getSfxStoredPreference);
  const [isOnHomeScreen, setIsOnHomeScreenState] = useState(false);
  const [isSplashComplete, setIsSplashCompleteState] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Inicializar áudio
  useEffect(() => {
    audioRef.current = new Audio(MUSIC_TRACKS[0]);
    audioRef.current.loop = false;
    audioRef.current.volume = 0;

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fadeIn = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    audio.volume = 0;
    const steps = 20;
    const stepDuration = FADE_DURATION / steps;
    const volumeStep = MUSIC_VOLUME / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.min(volumeStep * currentStep, MUSIC_VOLUME);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }
    }, stepDuration);
  }, []);

  const fadeOut = useCallback((onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) {
      onComplete?.();
      return;
    }

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const startVolume = audio.volume;
    if (startVolume === 0) {
      audio.pause();
      setIsMusicPlaying(false);
      onComplete?.();
      return;
    }

    const steps = 20;
    const stepDuration = FADE_DURATION / steps;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.max(startVolume - (volumeStep * currentStep), 0);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsMusicPlaying(false);
        onComplete?.();
      }
    }, stepDuration);
  }, []);

  // Quando a música termina, tocar a próxima
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTrackEnd = () => {
      const nextTrack = (currentTrack + 1) % MUSIC_TRACKS.length;
      setCurrentTrack(nextTrack);
      
      if (audio && isMusicEnabled && isOnHomeScreen) {
        audio.src = MUSIC_TRACKS[nextTrack];
        audio.load();
        audio.volume = MUSIC_VOLUME;
        audio.play().catch(console.error);
      }
    };

    audio.addEventListener('ended', handleTrackEnd);
    return () => audio.removeEventListener('ended', handleTrackEnd);
  }, [currentTrack, isMusicEnabled, isOnHomeScreen]);

  // Controlar música baseado em estar na tela inicial, splash completo e preferência do usuário
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Só toca música se: na home screen + splash completo + música habilitada
    if (isOnHomeScreen && isSplashComplete && isMusicEnabled) {
      // Iniciar música com fade in
      audio.src = MUSIC_TRACKS[currentTrack];
      audio.load();
      audio.volume = 0;
      audio.play().then(() => {
        setIsMusicPlaying(true);
        fadeIn();
      }).catch((error) => {
        console.log('Autoplay bloqueado:', error);
      });
    } else {
      // Parar música com fade out
      if (isMusicPlaying) {
        fadeOut();
      }
    }
  }, [isOnHomeScreen, isSplashComplete, isMusicEnabled]);

  const toggleMusic = useCallback(() => {
    const newEnabled = !isMusicEnabled;
    setIsMusicEnabled(newEnabled);
    localStorage.setItem(STORAGE_KEY, String(newEnabled));

    const audio = audioRef.current;
    if (!audio) return;

    if (newEnabled && isOnHomeScreen && isSplashComplete) {
      audio.src = MUSIC_TRACKS[currentTrack];
      audio.load();
      audio.volume = 0;
      audio.play().then(() => {
        setIsMusicPlaying(true);
        fadeIn();
      }).catch(console.error);
    } else {
      fadeOut();
    }
  }, [isMusicEnabled, isOnHomeScreen, isSplashComplete, currentTrack, fadeIn, fadeOut]);

  const setOnHomeScreen = useCallback((value: boolean) => {
    setIsOnHomeScreenState(value);
  }, []);

  const setSplashComplete = useCallback((value: boolean) => {
    setIsSplashCompleteState(value);
  }, []);

  // Toggle SFX
  const toggleSfx = useCallback(() => {
    const newEnabled = !isSfxEnabled;
    setIsSfxEnabled(newEnabled);
    localStorage.setItem(SFX_STORAGE_KEY, String(newEnabled));
  }, [isSfxEnabled]);

  // Efeitos sonoros - SÓ FUNCIONAM FORA DA TELA INICIAL E SE SFX ESTIVER HABILITADO
  const playClickSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try {
      createSinisterClick();
    } catch (e) {
      console.log('Audio not available');
    }
  }, [isOnHomeScreen, isSfxEnabled]);

  const playNotificationSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try {
      createNotificationSound();
    } catch (e) {
      console.log('Audio not available');
    }
  }, [isOnHomeScreen, isSfxEnabled]);

  const playSuccessSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try {
      createSuccessSound();
    } catch (e) {
      console.log('Audio not available');
    }
  }, [isOnHomeScreen, isSfxEnabled]);

  const playTimerSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try {
      createTimerSound();
    } catch (e) {
      console.log('Audio not available');
    }
  }, [isOnHomeScreen, isSfxEnabled]);

  const playTickSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try {
      createTickSound();
    } catch (e) {
      console.log('Audio not available');
    }
  }, [isOnHomeScreen, isSfxEnabled]);

  const playCountdownBeep = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try {
      createCountdownBeep();
    } catch (e) {
      console.log('Audio not available');
    }
  }, [isOnHomeScreen, isSfxEnabled]);

  return (
    <AudioContextData.Provider
      value={{
        isMusicPlaying,
        isMusicEnabled,
        isSfxEnabled,
        isOnHomeScreen,
        isSplashComplete,
        toggleMusic,
        toggleSfx,
        setOnHomeScreen,
        setSplashComplete,
        playClickSound,
        playNotificationSound,
        playSuccessSound,
        playTimerSound,
        playTickSound,
        playCountdownBeep,
      }}
    >
      {children}
    </AudioContextData.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContextData);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
