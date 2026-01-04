import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

// Playlist completa - tocará em ordem aleatória
const MUSIC_TRACKS = [
  '/audio/background-80.mp3',
  '/audio/background-lento.mp3',
  '/audio/gym-pro-funk1.mp3',
  '/audio/gym-pro-funk2.mp3',
  '/audio/peso-neon-new.mp3',
  '/audio/peso-do-ritmo-1-new.mp3',
  '/audio/peso-do-ritmo-new.mp3',
];

const MUSIC_VOLUME = 0.18;
const FADE_DURATION = 2000;
const SFX_VOLUME = 0.5;
const AUTO_PLAY_DELAY = 20000; // 20 segundos

interface AudioContextType {
  isMusicPlaying: boolean;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  isOnHomeScreen: boolean;
  isSplashComplete: boolean;
  analyserNode: AnalyserNode | null;
  toggleMusic: () => void;
  toggleSfx: () => void;
  setOnHomeScreen: (value: boolean) => void;
  setSplashComplete: (value: boolean) => void;
  stopMusicImmediately: () => void;
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
const FIRST_VISIT_KEY = 'gym_first_visit_done';
const MUSIC_STOPPED_SESSION_KEY = 'gym_music_stopped_session';

// Singleton AudioContext para melhor performance
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    return sharedAudioContext;
  } catch (e) {
    console.log('AudioContext not available');
    return null;
  }
};

// Embaralhar array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Sons sintetizados
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
  oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(SFX_VOLUME, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
};

const createTimerSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
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
    // Default true para primeira visita
    return stored === null ? true : stored === 'true';
  };

  const getSfxStoredPreference = (): boolean => {
    const stored = localStorage.getItem(SFX_STORAGE_KEY);
    return stored !== 'false';
  };

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(getStoredPreference);
  const [isSfxEnabled, setIsSfxEnabled] = useState(getSfxStoredPreference);
  const [isOnHomeScreen, setIsOnHomeScreenState] = useState(false);
  const [isSplashComplete, setIsSplashCompleteState] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<string[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Embaralhar playlist no início
  useEffect(() => {
    setShuffledPlaylist(shuffleArray(MUSIC_TRACKS));
  }, []);

  // Inicializar áudio e analyser
  useEffect(() => {
    if (shuffledPlaylist.length === 0) return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = shuffledPlaylist[0];
    audio.loop = false;
    audio.volume = 0;
    audioRef.current = audio;

    // Criar AudioContext e Analyser para visualização
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      setAnalyserNode(analyser);

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceNodeRef.current = source;
    } catch (e) {
      console.log('AudioContext for visualizer not available');
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [shuffledPlaylist]);

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

  // Para música imediatamente (para login)
  const stopMusicImmediately = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.volume = 0;
    }
    setIsMusicPlaying(false);
    // Marcar que música foi parada nesta sessão
    sessionStorage.setItem(MUSIC_STOPPED_SESSION_KEY, 'true');
  }, []);

  // Próxima música quando terminar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || shuffledPlaylist.length === 0) return;

    const handleTrackEnd = () => {
      const nextIndex = (currentTrackIndex + 1) % shuffledPlaylist.length;
      setCurrentTrackIndex(nextIndex);
      
      if (audio && isMusicEnabled && isOnHomeScreen) {
        audio.src = shuffledPlaylist[nextIndex];
        audio.load();
        audio.volume = MUSIC_VOLUME;
        audio.play().catch(console.error);
      }
    };

    audio.addEventListener('ended', handleTrackEnd);
    return () => audio.removeEventListener('ended', handleTrackEnd);
  }, [currentTrackIndex, shuffledPlaylist, isMusicEnabled, isOnHomeScreen]);

  // Lógica de autoplay com delay de 20s
  const startMusicWithDelay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || shuffledPlaylist.length === 0) return;

    // Verificar se música foi parada nesta sessão
    const wasStoppedThisSession = sessionStorage.getItem(MUSIC_STOPPED_SESSION_KEY) === 'true';
    if (wasStoppedThisSession) return;

    // Verificar se é primeira visita
    const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
    
    if (isFirstVisit) {
      // Primeira visita: aguardar 20 segundos
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
      autoPlayTimerRef.current = window.setTimeout(() => {
        if (audioRef.current && isMusicEnabled && isOnHomeScreen && isSplashComplete) {
          // Resume audio context se necessário
          if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
          }
          audioRef.current.src = shuffledPlaylist[currentTrackIndex];
          audioRef.current.load();
          audioRef.current.volume = 0;
          audioRef.current.play().then(() => {
            setIsMusicPlaying(true);
            setHasAutoPlayed(true);
            fadeIn();
          }).catch(console.error);
        }
      }, AUTO_PLAY_DELAY);
    } else if (!hasAutoPlayed) {
      // Não é primeira visita mas música não tocou ainda nesta sessão
      // Iniciar imediatamente após splash
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audio.src = shuffledPlaylist[currentTrackIndex];
      audio.load();
      audio.volume = 0;
      audio.play().then(() => {
        setIsMusicPlaying(true);
        setHasAutoPlayed(true);
        fadeIn();
      }).catch(console.error);
    }
  }, [shuffledPlaylist, currentTrackIndex, isMusicEnabled, isOnHomeScreen, isSplashComplete, hasAutoPlayed, fadeIn]);

  // Controlar música
  useEffect(() => {
    if (!shuffledPlaylist.length) return;

    const wasStoppedThisSession = sessionStorage.getItem(MUSIC_STOPPED_SESSION_KEY) === 'true';

    if (isOnHomeScreen && isSplashComplete && isMusicEnabled && !wasStoppedThisSession) {
      startMusicWithDelay();
    } else {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (isMusicPlaying) {
        fadeOut();
      }
    }
  }, [isOnHomeScreen, isSplashComplete, isMusicEnabled, shuffledPlaylist, startMusicWithDelay, fadeOut, isMusicPlaying]);

  const toggleMusic = useCallback(() => {
    const newEnabled = !isMusicEnabled;
    setIsMusicEnabled(newEnabled);
    localStorage.setItem(STORAGE_KEY, String(newEnabled));

    const audio = audioRef.current;
    if (!audio || !shuffledPlaylist.length) return;

    if (newEnabled && isOnHomeScreen && isSplashComplete) {
      // Limpar flag de parado na sessão
      sessionStorage.removeItem(MUSIC_STOPPED_SESSION_KEY);
      
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audio.src = shuffledPlaylist[currentTrackIndex];
      audio.load();
      audio.volume = 0;
      audio.play().then(() => {
        setIsMusicPlaying(true);
        fadeIn();
      }).catch(console.error);
    } else {
      sessionStorage.setItem(MUSIC_STOPPED_SESSION_KEY, 'true');
      fadeOut();
    }
  }, [isMusicEnabled, isOnHomeScreen, isSplashComplete, shuffledPlaylist, currentTrackIndex, fadeIn, fadeOut]);

  const setOnHomeScreen = useCallback((value: boolean) => {
    setIsOnHomeScreenState(value);
  }, []);

  const setSplashComplete = useCallback((value: boolean) => {
    setIsSplashCompleteState(value);
  }, []);

  const toggleSfx = useCallback(() => {
    const newEnabled = !isSfxEnabled;
    setIsSfxEnabled(newEnabled);
    localStorage.setItem(SFX_STORAGE_KEY, String(newEnabled));
  }, [isSfxEnabled]);

  // Efeitos sonoros
  const playClickSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try { createSinisterClick(); } catch {}
  }, [isOnHomeScreen, isSfxEnabled]);

  const playNotificationSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try { createNotificationSound(); } catch {}
  }, [isOnHomeScreen, isSfxEnabled]);

  const playSuccessSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try { createSuccessSound(); } catch {}
  }, [isOnHomeScreen, isSfxEnabled]);

  const playTimerSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try { createTimerSound(); } catch {}
  }, [isOnHomeScreen, isSfxEnabled]);

  const playTickSound = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try { createTickSound(); } catch {}
  }, [isOnHomeScreen, isSfxEnabled]);

  const playCountdownBeep = useCallback(() => {
    if (isOnHomeScreen || !isSfxEnabled) return;
    try { createCountdownBeep(); } catch {}
  }, [isOnHomeScreen, isSfxEnabled]);

  return (
    <AudioContextData.Provider
      value={{
        isMusicPlaying,
        isMusicEnabled,
        isSfxEnabled,
        isOnHomeScreen,
        isSplashComplete,
        analyserNode,
        toggleMusic,
        toggleSfx,
        setOnHomeScreen,
        setSplashComplete,
        stopMusicImmediately,
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
