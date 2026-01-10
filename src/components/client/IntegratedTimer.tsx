import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Timer, Zap, Repeat, 
  Volume2, VolumeX, ChevronUp, ChevronDown, X, 
  Flame, Target, Clock, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type TimerMode = 'stopwatch' | 'countdown' | 'emom' | 'amrap' | 'tabata' | 'rest';

interface TabataSettings {
  workTime: number;
  restTime: number;
  rounds: number;
}

interface EmomSettings {
  intervalTime: number;
  rounds: number;
}

interface IntegratedTimerProps {
  exerciseName?: string;
  defaultRestSeconds?: number;
  onComplete?: () => void;
  onRestComplete?: () => void;
  isResting?: boolean;
  restDuration?: number;
}

const IntegratedTimer: React.FC<IntegratedTimerProps> = ({
  exerciseName,
  defaultRestSeconds = 60,
  onComplete,
  onRestComplete,
  isResting = false,
  restDuration = 60
}) => {
  const [mode, setMode] = useState<TimerMode>(isResting ? 'rest' : 'stopwatch');
  const [time, setTime] = useState(isResting ? restDuration : 0);
  const [isRunning, setIsRunning] = useState(isResting);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // Countdown settings
  const [countdownStart, setCountdownStart] = useState(60);

  // EMOM settings
  const [emom, setEmom] = useState<EmomSettings>({ intervalTime: 60, rounds: 10 });
  const [emomRound, setEmomRound] = useState(1);

  // AMRAP settings
  const [amrapDuration, setAmrapDuration] = useState(300); // 5 min default
  const [amrapReps, setAmrapReps] = useState(0);

  // Tabata settings
  const [tabata, setTabata] = useState<TabataSettings>({ workTime: 20, restTime: 10, rounds: 8 });
  const [tabataRound, setTabataRound] = useState(1);
  const [tabataPhase, setTabataPhase] = useState<'work' | 'rest'>('work');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sintetizar som de notificação
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Som de conclusão - 3 beeps ascendentes
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

  // Som de aviso (countdown)
  const playBeep = useCallback(() => {
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

  // Handle rest mode from parent
  useEffect(() => {
    if (isResting) {
      setMode('rest');
      setTime(restDuration);
      setIsRunning(true);
    }
  }, [isResting, restDuration]);

  // Main timer logic
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTime(prev => {
        // Countdown modes
        if (mode === 'countdown' || mode === 'rest') {
          if (prev <= 1) {
            playSound();
            setIsRunning(false);
            if (mode === 'rest' && onRestComplete) {
              onRestComplete();
            }
            return 0;
          }
          if (prev === 4) playBeep();
          return prev - 1;
        }

        // EMOM mode
        if (mode === 'emom') {
          const newTime = prev + 1;
          if (newTime % emom.intervalTime === 0) {
            playSound();
            if (emomRound >= emom.rounds) {
              setIsRunning(false);
              onComplete?.();
              return newTime;
            }
            setEmomRound(r => r + 1);
          }
          return newTime;
        }

        // AMRAP mode
        if (mode === 'amrap') {
          if (prev <= 1) {
            playSound();
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          if (prev === 4) playBeep();
          return prev - 1;
        }

        // Tabata mode
        if (mode === 'tabata') {
          if (prev <= 1) {
            playSound();
            if (tabataPhase === 'work') {
              setTabataPhase('rest');
              return tabata.restTime;
            } else {
              if (tabataRound >= tabata.rounds) {
                setIsRunning(false);
                onComplete?.();
                return 0;
              }
              setTabataRound(r => r + 1);
              setTabataPhase('work');
              return tabata.workTime;
            }
          }
          if (prev === 4) playBeep();
          return prev - 1;
        }

        // Stopwatch
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, emom, emomRound, tabata, tabataRound, tabataPhase, playSound, playBeep, onRestComplete, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setIsRunning(false);
    setEmomRound(1);
    setTabataRound(1);
    setTabataPhase('work');
    setAmrapReps(0);
    
    switch (mode) {
      case 'countdown':
        setTime(countdownStart);
        break;
      case 'emom':
        setTime(0);
        break;
      case 'amrap':
        setTime(amrapDuration);
        break;
      case 'tabata':
        setTime(tabata.workTime);
        break;
      case 'rest':
        setTime(restDuration);
        break;
      default:
        setTime(0);
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setEmomRound(1);
    setTabataRound(1);
    setTabataPhase('work');
    setAmrapReps(0);

    switch (newMode) {
      case 'countdown':
        setTime(countdownStart);
        break;
      case 'emom':
        setTime(0);
        break;
      case 'amrap':
        setTime(amrapDuration);
        break;
      case 'tabata':
        setTime(tabata.workTime);
        break;
      case 'rest':
        setTime(defaultRestSeconds);
        break;
      default:
        setTime(0);
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'emom': return 'text-blue-500';
      case 'amrap': return 'text-purple-500';
      case 'tabata': return tabataPhase === 'work' ? 'text-red-500' : 'text-green-500';
      case 'rest': return 'text-green-500';
      case 'countdown': return 'text-orange-500';
      default: return 'text-primary';
    }
  };

  const getProgress = () => {
    switch (mode) {
      case 'countdown':
      case 'rest':
        return ((countdownStart - time) / countdownStart) * 100;
      case 'tabata':
        const total = tabataPhase === 'work' ? tabata.workTime : tabata.restTime;
        return ((total - time) / total) * 100;
      case 'amrap':
        return ((amrapDuration - time) / amrapDuration) * 100;
      case 'emom':
        return (emomRound / emom.rounds) * 100;
      default:
        return 0;
    }
  };

  // Minimized view
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-20 right-4 z-50"
      >
        <Button
          onClick={() => setIsExpanded(true)}
          className={`rounded-full w-16 h-16 shadow-lg ${
            isRunning ? 'bg-primary animate-pulse' : 'bg-card border border-border'
          }`}
        >
          <div className="text-center">
            <Timer className={`w-5 h-5 mx-auto ${getModeColor()}`} />
            <span className="text-[10px] font-mono">{formatTime(time)}</span>
          </div>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${getModeColor()}`} />
          <span className="text-sm font-medium">Timer</span>
          {exerciseName && (
            <Badge variant="outline" className="text-[10px]">
              {exerciseName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setIsExpanded(false)}
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1 p-2 bg-muted/20 overflow-x-auto">
        {[
          { mode: 'stopwatch' as TimerMode, icon: Clock, label: 'Crono' },
          { mode: 'countdown' as TimerMode, icon: Timer, label: 'Contagem' },
          { mode: 'rest' as TimerMode, icon: Pause, label: 'Descanso' },
          { mode: 'emom' as TimerMode, icon: Repeat, label: 'EMOM' },
          { mode: 'amrap' as TimerMode, icon: Flame, label: 'AMRAP' },
          { mode: 'tabata' as TimerMode, icon: Zap, label: 'Tabata' },
        ].map(({ mode: m, icon: Icon, label }) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? 'default' : 'ghost'}
            className={`flex-shrink-0 text-xs px-2 h-7 ${mode === m ? 'bg-primary' : ''}`}
            onClick={() => switchMode(m)}
          >
            <Icon size={12} className="mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="p-4 text-center">
        {/* Mode-specific info */}
        {mode === 'emom' && (
          <div className="text-xs text-muted-foreground mb-2">
            Round {emomRound}/{emom.rounds} • Cada {emom.intervalTime}s
          </div>
        )}
        {mode === 'amrap' && (
          <div className="text-xs text-muted-foreground mb-2">
            Reps: <span className="text-primary font-bold">{amrapReps}</span>
          </div>
        )}
        {mode === 'tabata' && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge className={tabataPhase === 'work' ? 'bg-red-500' : 'bg-green-500'}>
              {tabataPhase === 'work' ? 'TRABALHO' : 'DESCANSO'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Round {tabataRound}/{tabata.rounds}
            </span>
          </div>
        )}
        {mode === 'rest' && (
          <div className="text-xs text-green-500 mb-2">
            ⏸ DESCANSANDO
          </div>
        )}

        {/* Main Timer */}
        <motion.div
          key={time}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          className={`text-5xl font-mono font-bold ${getModeColor()} tabular-nums`}
        >
          {formatTime(time)}
        </motion.div>

        {/* Progress bar */}
        {(mode !== 'stopwatch') && (
          <Progress value={getProgress()} className="h-1 mt-3" />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-3 border-t border-border/50">
        <Button
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full"
          onClick={resetTimer}
        >
          <RotateCcw size={18} />
        </Button>

        <Button
          size="icon"
          className={`h-14 w-14 rounded-full ${isRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary'}`}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </Button>

        {mode === 'amrap' && (
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full"
            onClick={() => setAmrapReps(r => r + 1)}
          >
            <span className="text-sm font-bold">+1</span>
          </Button>
        )}

        {mode === 'rest' && onRestComplete && (
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full bg-green-500/20 border-green-500/50 text-green-500"
            onClick={() => {
              setIsRunning(false);
              onRestComplete();
            }}
          >
            <Check size={18} />
          </Button>
        )}
      </div>

      {/* Settings for specific modes */}
      <AnimatePresence>
        {(mode === 'countdown' || mode === 'rest') && !isRunning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCountdownStart(s => Math.max(10, s - 10))}>
                -10s
              </Button>
              <span className="text-sm font-mono w-16 text-center">{countdownStart}s</span>
              <Button size="sm" variant="outline" onClick={() => setCountdownStart(s => s + 10)}>
                +10s
              </Button>
            </div>
          </motion.div>
        )}

        {mode === 'tabata' && !isRunning && tabataRound === 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3 space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs">
              <span>Trabalho: {tabata.workTime}s</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTabata(t => ({ ...t, workTime: Math.max(5, t.workTime - 5) }))}>
                  <ChevronDown size={12} />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTabata(t => ({ ...t, workTime: t.workTime + 5 }))}>
                  <ChevronUp size={12} />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Descanso: {tabata.restTime}s</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTabata(t => ({ ...t, restTime: Math.max(5, t.restTime - 5) }))}>
                  <ChevronDown size={12} />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTabata(t => ({ ...t, restTime: t.restTime + 5 }))}>
                  <ChevronUp size={12} />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Rounds: {tabata.rounds}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTabata(t => ({ ...t, rounds: Math.max(1, t.rounds - 1) }))}>
                  <ChevronDown size={12} />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTabata(t => ({ ...t, rounds: t.rounds + 1 }))}>
                  <ChevronUp size={12} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'emom' && !isRunning && emomRound === 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3 space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs">
              <span>Intervalo: {emom.intervalTime}s</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEmom(e => ({ ...e, intervalTime: Math.max(30, e.intervalTime - 15) }))}>
                  <ChevronDown size={12} />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEmom(e => ({ ...e, intervalTime: e.intervalTime + 15 }))}>
                  <ChevronUp size={12} />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Rounds: {emom.rounds}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEmom(e => ({ ...e, rounds: Math.max(1, e.rounds - 1) }))}>
                  <ChevronDown size={12} />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEmom(e => ({ ...e, rounds: e.rounds + 1 }))}>
                  <ChevronUp size={12} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'amrap' && !isRunning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAmrapDuration(d => Math.max(60, d - 60))}>
                -1min
              </Button>
              <span className="text-sm font-mono w-20 text-center">{Math.floor(amrapDuration / 60)}min</span>
              <Button size="sm" variant="outline" onClick={() => setAmrapDuration(d => d + 60)}>
                +1min
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick presets for rest */}
      {mode === 'rest' && !isRunning && (
        <div className="flex gap-1 px-3 pb-3 justify-center">
          {[30, 45, 60, 90, 120].map(sec => (
            <Button
              key={sec}
              size="sm"
              variant="outline"
              className="text-xs px-2"
              onClick={() => {
                setTime(sec);
                setCountdownStart(sec);
              }}
            >
              {sec}s
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default IntegratedTimer;
