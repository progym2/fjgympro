import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Timer, Volume2, VolumeX, 
  Plus, Minus, ChevronUp, ChevronDown, X, Maximize2, Minimize2,
  Dumbbell, Flame, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WorkoutTimerProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName?: string;
  defaultRestSeconds?: number;
  onRestComplete?: () => void;
}

type TimerMode = 'stopwatch' | 'countdown' | 'tabata' | 'rest';

interface TabataSettings {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  currentRound: number;
  isWork: boolean;
}

const WorkoutTimer: React.FC<WorkoutTimerProps> = ({
  isOpen,
  onClose,
  exerciseName,
  defaultRestSeconds = 60,
  onRestComplete
}) => {
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [countdownStart, setCountdownStart] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tabata, setTabata] = useState<TabataSettings>({
    workSeconds: 20,
    restSeconds: 10,
    rounds: 8,
    currentRound: 1,
    isWork: true
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sintetizar som de notificação
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Som de conclusão - 3 beeps
      const playBeep = (startTime: number, frequency: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + 0.2);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + 0.2);
      };
      
      playBeep(0, 880);
      playBeep(0.25, 880);
      playBeep(0.5, 1175);
    } catch (e) {
      console.log('Sound not available');
    }
  }, [soundEnabled]);

  // Som de aviso (3 segundos restantes)
  const playWarningBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Beep sound not available');
    }
  }, [soundEnabled]);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          if (mode === 'stopwatch') {
            return prev + 1;
          } else if (mode === 'countdown' || mode === 'rest') {
            if (prev <= 1) {
              playSound();
              setIsRunning(false);
              if (mode === 'rest' && onRestComplete) {
                onRestComplete();
              }
              toast.success(mode === 'rest' ? '⏰ Descanso finalizado!' : '⏰ Tempo esgotado!');
              return 0;
            }
            if (prev === 4) playWarningBeep();
            return prev - 1;
          } else if (mode === 'tabata') {
            if (prev <= 1) {
              playSound();
              // Switch between work and rest or advance round
              setTabata(t => {
                if (t.isWork) {
                  // Switch to rest
                  setTime(t.restSeconds);
                  return { ...t, isWork: false };
                } else {
                  // Switch to work or end
                  if (t.currentRound >= t.rounds) {
                    setIsRunning(false);
                    toast.success('🎉 Tabata completo!');
                    return { ...t, currentRound: 1, isWork: true };
                  }
                  setTime(t.workSeconds);
                  return { ...t, currentRound: t.currentRound + 1, isWork: true };
                }
              });
              return prev;
            }
            if (prev === 4) playWarningBeep();
            return prev - 1;
          }
          return prev;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, playSound, playWarningBeep, onRestComplete]);

  // Reset when mode changes
  useEffect(() => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setTime(0);
    } else if (mode === 'countdown') {
      setTime(countdownStart);
    } else if (mode === 'rest') {
      setTime(defaultRestSeconds);
    } else if (mode === 'tabata') {
      setTime(tabata.workSeconds);
      setTabata(t => ({ ...t, currentRound: 1, isWork: true }));
    }
  }, [mode, countdownStart, defaultRestSeconds, tabata.workSeconds]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setTime(0);
    } else if (mode === 'countdown') {
      setTime(countdownStart);
    } else if (mode === 'rest') {
      setTime(defaultRestSeconds);
    } else if (mode === 'tabata') {
      setTime(tabata.workSeconds);
      setTabata(t => ({ ...t, currentRound: 1, isWork: true }));
    }
  };

  const adjustCountdown = (delta: number) => {
    const newValue = Math.max(5, Math.min(300, countdownStart + delta));
    setCountdownStart(newValue);
    if (!isRunning && mode === 'countdown') {
      setTime(newValue);
    }
  };

  const adjustTabata = (field: 'workSeconds' | 'restSeconds' | 'rounds', delta: number) => {
    setTabata(t => {
      const minMax = field === 'rounds' ? { min: 1, max: 20 } : { min: 5, max: 120 };
      const newValue = Math.max(minMax.min, Math.min(minMax.max, t[field] + delta));
      return { ...t, [field]: newValue };
    });
  };

  // Get progress for circular indicator
  const getProgress = (): number => {
    if (mode === 'stopwatch') return 0;
    if (mode === 'countdown' || mode === 'rest') {
      const total = mode === 'rest' ? defaultRestSeconds : countdownStart;
      return ((total - time) / total) * 100;
    }
    if (mode === 'tabata') {
      const total = tabata.isWork ? tabata.workSeconds : tabata.restSeconds;
      return ((total - time) / total) * 100;
    }
    return 0;
  };

  // Get color based on mode
  const getModeColor = (): string => {
    if (mode === 'tabata' && !tabata.isWork) return 'text-green-400';
    switch (mode) {
      case 'stopwatch': return 'text-cyan-400';
      case 'countdown': return 'text-purple-400';
      case 'rest': return 'text-green-400';
      case 'tabata': return tabata.isWork ? 'text-red-400' : 'text-green-400';
      default: return 'text-cyan-400';
    }
  };

  const getBgColor = (): string => {
    if (mode === 'tabata' && !tabata.isWork) return 'from-green-500/20 to-emerald-500/20';
    switch (mode) {
      case 'stopwatch': return 'from-cyan-500/20 to-blue-500/20';
      case 'countdown': return 'from-purple-500/20 to-pink-500/20';
      case 'rest': return 'from-green-500/20 to-emerald-500/20';
      case 'tabata': return tabata.isWork ? 'from-red-500/20 to-orange-500/20' : 'from-green-500/20 to-emerald-500/20';
      default: return 'from-cyan-500/20 to-blue-500/20';
    }
  };

  if (!isOpen) return null;

  // Minimized floating version
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-24 right-4 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMinimized(false)}
          className={`w-16 h-16 rounded-full bg-gradient-to-br ${getBgColor()} border-2 border-current ${getModeColor()} shadow-lg flex flex-col items-center justify-center`}
        >
          <Timer className="w-5 h-5" />
          <span className="text-xs font-bold">{formatTime(time)}</span>
          {isRunning && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-current opacity-50"
            />
          )}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
      >
        <motion.div
          className={`w-full max-w-sm bg-gradient-to-br ${getBgColor()} backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${getModeColor()}`} />
              <span className="font-bebas tracking-wider text-foreground">
                {mode === 'stopwatch' ? 'CRONÔMETRO' : 
                 mode === 'countdown' ? 'CONTAGEM' : 
                 mode === 'rest' ? 'DESCANSO' : 
                 'TABATA'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg hover:bg-background/50 transition-colors"
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-lg hover:bg-background/50 transition-colors"
              >
                <Minimize2 size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-background/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-4 gap-1 p-2 mx-4 mt-4 bg-background/30 rounded-xl">
            {(['stopwatch', 'countdown', 'rest', 'tabata'] as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                  mode === m 
                    ? 'bg-background/80 text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'stopwatch' ? '⏱️' : m === 'countdown' ? '⏳' : m === 'rest' ? '😮‍💨' : '🔥'}
              </button>
            ))}
          </div>

          {/* Exercise Name */}
          {exerciseName && (
            <div className="text-center mt-2 px-4">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Dumbbell size={14} />
                {exerciseName}
              </p>
            </div>
          )}

          {/* Timer Display */}
          <div className="p-8 flex flex-col items-center">
            {/* Circular Progress */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-background/30"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={553}
                  strokeDashoffset={553 - (553 * getProgress()) / 100}
                  strokeLinecap="round"
                  className={getModeColor()}
                  animate={{ strokeDashoffset: 553 - (553 * getProgress()) / 100 }}
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  key={time}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className={`text-5xl font-bebas tracking-wider ${getModeColor()}`}
                >
                  {formatTime(time)}
                </motion.span>
                
                {mode === 'tabata' && (
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-bold ${tabata.isWork ? 'text-red-400' : 'text-green-400'}`}>
                      {tabata.isWork ? '💪 TRABALHO' : '😮‍💨 DESCANSO'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Round {tabata.currentRound}/{tabata.rounds}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Countdown/Tabata adjusters */}
            {mode === 'countdown' && !isRunning && (
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={() => adjustCountdown(-15)}
                  className="p-2 rounded-full bg-background/50 hover:bg-background/80"
                >
                  <Minus size={16} />
                </button>
                <span className="text-sm text-muted-foreground w-20 text-center">
                  {countdownStart}s
                </span>
                <button
                  onClick={() => adjustCountdown(15)}
                  className="p-2 rounded-full bg-background/50 hover:bg-background/80"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            {mode === 'tabata' && !isRunning && (
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trabalho</p>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => adjustTabata('workSeconds', -5)} className="p-1 rounded bg-background/50">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-medium w-8">{tabata.workSeconds}s</span>
                    <button onClick={() => adjustTabata('workSeconds', 5)} className="p-1 rounded bg-background/50">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descanso</p>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => adjustTabata('restSeconds', -5)} className="p-1 rounded bg-background/50">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-medium w-8">{tabata.restSeconds}s</span>
                    <button onClick={() => adjustTabata('restSeconds', 5)} className="p-1 rounded bg-background/50">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rounds</p>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => adjustTabata('rounds', -1)} className="p-1 rounded bg-background/50">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-medium w-8">{tabata.rounds}</span>
                    <button onClick={() => adjustTabata('rounds', 1)} className="p-1 rounded bg-background/50">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 p-6 pt-0">
            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={resetTimer}
            >
              <RotateCcw size={20} />
            </Button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                isRunning 
                  ? 'bg-yellow-500 text-yellow-950' 
                  : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
              }`}
            >
              {isRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </motion.button>

            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => {
                playSound();
              }}
            >
              <Volume2 size={20} />
            </Button>
          </div>

          {/* Quick presets for rest mode */}
          {mode === 'rest' && !isRunning && (
            <div className="px-6 pb-6">
              <p className="text-xs text-muted-foreground text-center mb-2">Presets de descanso</p>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setTime(sec)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      time === sec 
                        ? 'bg-green-500/30 text-green-400 border border-green-500/50' 
                        : 'bg-background/30 text-muted-foreground hover:bg-background/50'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkoutTimer;
