import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

// Playlist de músicas - todas as músicas disponíveis
const MUSIC_TRACKS: { path: string; name: string }[] = [
  { path: '/audio/background-80.mp3', name: 'Background 80s' },
  { path: '/audio/background-lento.mp3', name: 'Background Lento' },
  { path: '/audio/gym-pro-funk1.mp3', name: 'Gym Pro Funk 1' },
  { path: '/audio/gym-pro-funk2.mp3', name: 'Gym Pro Funk 2' },
  { path: '/audio/peso-neon.mp3', name: 'Peso Neon' },
  { path: '/audio/peso-do-ritmo.mp3', name: 'Peso do Ritmo' },
  { path: '/audio/peso-do-ritmo-1.mp3', name: 'Peso do Ritmo 2' },
];

const DEFAULT_MUSIC_VOLUME = 0.18;
const MAX_MUSIC_VOLUME = 0.5;
const FADE_DURATION = 2000;
const SFX_VOLUME = 0.5;
const VOLUME_STORAGE_KEY = 'gym_music_volume';
const AUTOPLAY_DELAY_MS = 20000; // 20 segundos após splash

interface AudioContextType {
  isMusicPlaying: boolean;
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  isOnHomeScreen: boolean;
  isSplashComplete: boolean;
  analyserNode: AnalyserNode | null;
  musicVolume: number;
  currentTrackName: string;
  setMusicVolume: (volume: number) => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  setOnHomeScreen: (value: boolean) => void;
  setSplashComplete: (value: boolean) => void;
  stopMusicImmediately: () => void;
  tryAutoPlay: () => void;
  skipToNextTrack: () => void;
  skipToPreviousTrack: () => void;
  playClickSound: () => void;
  playHoverSound: () => void;
  playNotificationSound: () => void;
  playSuccessSound: () => void;
  playTimerSound: () => void;
  playTickSound: () => void;
  playCountdownBeep: () => void;
}

const AudioContextData = createContext<AudioContextType | undefined>(undefined);

const STORAGE_KEY = 'gym_music_enabled';
const SFX_STORAGE_KEY = 'gym_sfx_enabled';
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

// Som suave de hover
const createHoverSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.06);
  
  gainNode.gain.setValueAtTime(SFX_VOLUME * 0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.08);
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
    return stored === null ? true : stored === 'true';
  };

  const getSfxStoredPreference = (): boolean => {
    const stored = localStorage.getItem(SFX_STORAGE_KEY);
    return stored !== 'false';
  };

  const getStoredVolume = (): number => {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_MUSIC_VOLUME;
  };

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(getStoredPreference);
  const [isSfxEnabled, setIsSfxEnabled] = useState(getSfxStoredPreference);
  const [isOnHomeScreen, setIsOnHomeScreenState] = useState(false);
  const [isSplashComplete, setIsSplashCompleteState] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<typeof MUSIC_TRACKS>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(getStoredVolume);
  const [autoplayScheduled, setAutoplayScheduled] = useState(false);
  const autoplayTimerRef = useRef<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isInitializedRef = useRef(false);

// Inicializar áudio e embaralhar playlist
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const shuffled = shuffleArray(MUSIC_TRACKS);
    setShuffledPlaylist(shuffled);

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    // Só define src se houver músicas na playlist
    if (shuffled.length > 0) {
      audio.src = shuffled[0].path;
    }
    audio.loop = false;
    audio.volume = 0;
    audioRef.current = audio;

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Configurar analyser após interação do usuário
  const setupAnalyser = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      setAnalyserNode(analyser);

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceNodeRef.current = source;
    } catch (e) {
      console.log('AudioContext for visualizer not available');
    }
  }, []);

  const fadeIn = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    audio.volume = 0;
    const steps = 20;
    const stepDuration = FADE_DURATION / steps;
    const volumeStep = musicVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.min(volumeStep * currentStep, musicVolume);
      if (audioRef.current) audioRef.current.volume = newVolume;

      if (currentStep >= steps && fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, stepDuration);
  }, [musicVolume]);

  const fadeOut = useCallback((onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) {
      onComplete?.();
      return;
    }

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

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
      if (audioRef.current) audioRef.current.volume = newVolume;

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (audioRef.current) audioRef.current.pause();
        setIsMusicPlaying(false);
        onComplete?.();
      }
    }, stepDuration);
  }, []);

  const stopMusicImmediately = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.volume = 0;
    }
    setIsMusicPlaying(false);
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
        audio.src = shuffledPlaylist[nextIndex].path;
        audio.load();
        audio.volume = musicVolume;
        audio.play().catch(console.error);
      }
    };

    audio.addEventListener('ended', handleTrackEnd);
    return () => audio.removeEventListener('ended', handleTrackEnd);
  }, [currentTrackIndex, shuffledPlaylist, isMusicEnabled, isOnHomeScreen, musicVolume]);

  // Tentar autoplay após interação
  const tryAutoPlay = useCallback(() => {
    console.log('tryAutoPlay called', { 
      hasUserInteracted, 
      isMusicEnabled, 
      isOnHomeScreen, 
      isSplashComplete, 
      isMusicPlaying,
      shuffledPlaylistLength: shuffledPlaylist.length,
      audioRef: !!audioRef.current
    });

    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    const audio = audioRef.current;
    const wasStoppedThisSession = sessionStorage.getItem(MUSIC_STOPPED_SESSION_KEY) === 'true';
    
    if (!audio || !isMusicEnabled || !isOnHomeScreen || !isSplashComplete || wasStoppedThisSession || isMusicPlaying) {
      console.log('tryAutoPlay blocked', { audio: !!audio, wasStoppedThisSession });
      return;
    }

    setupAnalyser();
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (shuffledPlaylist.length > 0) {
      console.log('Playing track:', shuffledPlaylist[currentTrackIndex]?.path);
      audio.src = shuffledPlaylist[currentTrackIndex].path;
      audio.load();
      audio.volume = 0;
      audio.play().then(() => {
        console.log('Music started playing');
        setIsMusicPlaying(true);
        fadeIn();
      }).catch((e) => {
        console.log('Autoplay blocked:', e.message);
      });
    } else {
      console.log('Playlist empty, cannot play');
    }
  }, [hasUserInteracted, isMusicEnabled, isOnHomeScreen, isSplashComplete, isMusicPlaying, shuffledPlaylist, currentTrackIndex, setupAnalyser, fadeIn]);

  // Agendar autoplay com delay de 20 segundos após splash complete
  useEffect(() => {
    if (isOnHomeScreen && isSplashComplete && isMusicEnabled && hasUserInteracted && !autoplayScheduled) {
      const wasStoppedThisSession = sessionStorage.getItem(MUSIC_STOPPED_SESSION_KEY) === 'true';
      if (!wasStoppedThisSession && !isMusicPlaying) {
        setAutoplayScheduled(true);
        
        // Clear any existing timer
        if (autoplayTimerRef.current) {
          clearTimeout(autoplayTimerRef.current);
        }
        
        // Agendar reprodução após 20 segundos
        autoplayTimerRef.current = window.setTimeout(() => {
          tryAutoPlay();
        }, AUTOPLAY_DELAY_MS);
      }
    }
    
    // Cleanup timer when leaving home screen
    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [isOnHomeScreen, isSplashComplete, isMusicEnabled, hasUserInteracted, isMusicPlaying, autoplayScheduled, tryAutoPlay]);

  // Reset autoplay scheduled when leaving home
  useEffect(() => {
    if (!isOnHomeScreen) {
      setAutoplayScheduled(false);
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    }
  }, [isOnHomeScreen]);

  // Parar música quando sair da home
  useEffect(() => {
    if (!isOnHomeScreen && isMusicPlaying) {
      fadeOut();
    }
  }, [isOnHomeScreen, isMusicPlaying, fadeOut]);

  const toggleMusic = useCallback(() => {
    console.log('toggleMusic called', { isMusicPlaying, shuffledPlaylistLength: shuffledPlaylist.length });
    
    const audio = audioRef.current;
    if (!audio) {
      console.log('No audio ref');
      return;
    }
    
    if (shuffledPlaylist.length === 0) {
      console.log('Playlist empty');
      return;
    }

    // Se está tocando, pausa
    if (isMusicPlaying) {
      console.log('Pausing music');
      sessionStorage.setItem(MUSIC_STOPPED_SESSION_KEY, 'true');
      setIsMusicEnabled(false);
      localStorage.setItem(STORAGE_KEY, 'false');
      fadeOut();
    } else {
      // Se não está tocando, inicia
      console.log('Starting music');
      sessionStorage.removeItem(MUSIC_STOPPED_SESSION_KEY);
      setIsMusicEnabled(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      setHasUserInteracted(true);
      
      setupAnalyser();
      
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      console.log('Playing track:', shuffledPlaylist[currentTrackIndex]?.path);
      audio.src = shuffledPlaylist[currentTrackIndex].path;
      audio.load();
      audio.volume = 0;
      audio.play().then(() => {
        console.log('Music started via toggle');
        setIsMusicPlaying(true);
        fadeIn();
      }).catch((e) => console.error('Play failed:', e));
    }
  }, [isMusicPlaying, shuffledPlaylist, currentTrackIndex, setupAnalyser, fadeIn, fadeOut]);

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

  // Atualizar volume da música
  const setMusicVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(volume, MAX_MUSIC_VOLUME));
    setMusicVolumeState(clampedVolume);
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clampedVolume));
    
    if (audioRef.current && isMusicPlaying) {
      audioRef.current.volume = clampedVolume;
    }
  }, [isMusicPlaying]);

  // Pular para próxima música
  const skipToNextTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || shuffledPlaylist.length === 0) return;

    const nextIndex = (currentTrackIndex + 1) % shuffledPlaylist.length;
    setCurrentTrackIndex(nextIndex);
    
    audio.src = shuffledPlaylist[nextIndex].path;
    audio.load();
    
    if (isMusicPlaying) {
      audio.volume = musicVolume;
      audio.play().catch(console.error);
    }
  }, [shuffledPlaylist, currentTrackIndex, isMusicPlaying, musicVolume]);

  // Voltar para música anterior
  const skipToPreviousTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || shuffledPlaylist.length === 0) return;

    const prevIndex = currentTrackIndex === 0 
      ? shuffledPlaylist.length - 1 
      : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    
    audio.src = shuffledPlaylist[prevIndex].path;
    audio.load();
    
    if (isMusicPlaying) {
      audio.volume = musicVolume;
      audio.play().catch(console.error);
    }
  }, [shuffledPlaylist, currentTrackIndex, isMusicPlaying, musicVolume]);

  // Nome da música atual
  const currentTrackName = shuffledPlaylist.length > 0 
    ? shuffledPlaylist[currentTrackIndex]?.name || 'Música' 
    : '';

  const playClickSound = useCallback(() => {
    if (!isSfxEnabled) return;
    try { createSinisterClick(); } catch {}
  }, [isSfxEnabled]);

  const playHoverSound = useCallback(() => {
    if (!isSfxEnabled) return;
    try { createHoverSound(); } catch {}
  }, [isSfxEnabled]);

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
        musicVolume,
        currentTrackName,
        setMusicVolume,
        toggleMusic,
        toggleSfx,
        setOnHomeScreen,
        setSplashComplete,
        stopMusicImmediately,
        tryAutoPlay,
        skipToNextTrack,
        skipToPreviousTrack,
        playClickSound,
        playHoverSound,
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
