import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Timer, Volume2, VolumeX, 
  Plus, Minus, ArrowLeft, Dumbbell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAudio } from '@/contexts/AudioContext';

type TimerMode = 'stopwatch' | 'countdown' | 'tabata' | 'rest';

interface TabataSettings {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  currentRound: number;
  isWork: boolean;
}

const WorkoutTimerPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSfxEnabled, toggleSfx, playTickSound, playCountdownBeep, playTimerSound, playSuccessSound } = useAudio();
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [countdownStart, setCountdownStart] = useState(60);
  const [restStart, setRestStart] = useState(60);
  const [tabata, setTabata] = useState<TabataSettings>({
    workSeconds: 20,
    restSeconds: 10,
    rounds: 8,
    currentRound: 1,
    isWork: true
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(0);

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    playSuccessSound();
  }, [playSuccessSound]);

  // Play warning beep at 3 seconds
  const playWarningBeep = useCallback(() => {
    playCountdownBeep();
  }, [playCountdownBeep]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          const now = Date.now();
          
          if (mode === 'stopwatch') {
            // Play tick sound every second for stopwatch
            if (now - lastTickRef.current >= 900) {
              playTickSound();
              lastTickRef.current = now;
            }
            return prev + 1;
          } else if (mode === 'countdown' || mode === 'rest') {
            if (prev <= 1) {
              playCompletionSound();
              setIsRunning(false);
              toast.success(mode === 'rest' ? '⏰ Descanso finalizado!' : '⏰ Tempo esgotado!');
              return 0;
            }
            // Play countdown beep in last 5 seconds
            if (prev <= 5) {
              playCountdownBeep();
            } else if (now - lastTickRef.current >= 900) {
              playTickSound();
              lastTickRef.current = now;
            }
            return prev - 1;
          } else if (mode === 'tabata') {
            if (prev <= 1) {
              playTimerSound();
              setTabata(t => {
                if (t.isWork) {
                  setTime(t.restSeconds);
                  return { ...t, isWork: false };
                } else {
                  if (t.currentRound >= t.rounds) {
                    setIsRunning(false);
                    playCompletionSound();
                    toast.success('🎉 Tabata completo!');
                    return { ...t, currentRound: 1, isWork: true };
                  }
                  setTime(t.workSeconds);
                  return { ...t, currentRound: t.currentRound + 1, isWork: true };
                }
              });
              return prev;
            }
            // Play countdown beep in last 3 seconds
            if (prev <= 3) {
              playCountdownBeep();
            } else if (now - lastTickRef.current >= 900) {
              playTickSound();
              lastTickRef.current = now;
            }
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
  }, [isRunning, mode, playCompletionSound, playWarningBeep, playTickSound, playCountdownBeep, playTimerSound]);

  useEffect(() => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setTime(0);
    } else if (mode === 'countdown') {
      setTime(countdownStart);
    } else if (mode === 'rest') {
      setTime(restStart);
    } else if (mode === 'tabata') {
      setTime(tabata.workSeconds);
      setTabata(t => ({ ...t, currentRound: 1, isWork: true }));
    }
  }, [mode, countdownStart, restStart, tabata.workSeconds]);

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
      setTime(restStart);
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

  const adjustRest = (delta: number) => {
    const newValue = Math.max(5, Math.min(300, restStart + delta));
    setRestStart(newValue);
    if (!isRunning && mode === 'rest') {
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

  const getProgress = (): number => {
    if (mode === 'stopwatch') return 0;
    if (mode === 'countdown') {
      return ((countdownStart - time) / countdownStart) * 100;
    }
    if (mode === 'rest') {
      return ((restStart - time) / restStart) * 100;
    }
    if (mode === 'tabata') {
      const total = tabata.isWork ? tabata.workSeconds : tabata.restSeconds;
      return ((total - time) / total) * 100;
    }
    return 0;
  };

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

  const modes = [
    { id: 'stopwatch' as TimerMode, label: 'Cronômetro', icon: '⏱️', desc: 'Tempo corrido' },
    { id: 'countdown' as TimerMode, label: 'Contagem', icon: '⏳', desc: 'Regressiva' },
    { id: 'rest' as TimerMode, label: 'Descanso', icon: '😮‍💨', desc: 'Entre séries' },
    { id: 'tabata' as TimerMode, label: 'Tabata', icon: '🔥', desc: 'HIIT' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 max-w-md mx-auto"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${getBgColor()}`}>
            <Timer className={`w-5 h-5 ${getModeColor()}`} />
          </div>
          <div>
            <h2 className="text-lg font-bebas text-primary">TIMER</h2>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={toggleSfx}
          >
            {isSfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate('/client')}>
            <ArrowLeft size={16} className="mr-1" /> Voltar
          </Button>
        </div>
      </div>

      {/* Compact Mode Selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-2 rounded-lg border transition-all ${
              mode === m.id 
                ? `bg-gradient-to-br ${getBgColor()} border-current ${getModeColor()}` 
                : 'bg-card/50 border-border/50'
            }`}
          >
            <span className="text-lg">{m.icon}</span>
            <p className="text-[10px] font-medium mt-0.5">{m.label}</p>
          </button>
        ))}
      </div>

      {/* Compact Timer Display */}
      <Card className={`bg-gradient-to-br ${getBgColor()} border-border/30`}>
        <CardContent className="p-4 flex flex-col items-center">
          {/* Smaller Circular Progress */}
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-background/30"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={283}
                strokeDashoffset={283 - (283 * getProgress()) / 100}
                strokeLinecap="round"
                className={getModeColor()}
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                key={time}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className={`text-4xl font-bebas tracking-wider ${getModeColor()}`}
              >
                {formatTime(time)}
              </motion.span>
              
              {mode === 'tabata' && (
                <div className="text-center mt-1">
                  <p className={`text-xs font-bold ${tabata.isWork ? 'text-red-400' : 'text-green-400'}`}>
                    {tabata.isWork ? '💪 TRABALHO' : '😮‍💨 DESCANSO'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tabata.currentRound}/{tabata.rounds}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Compact Settings */}
          {mode === 'countdown' && !isRunning && (
            <div className="flex items-center gap-3 mt-3">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustCountdown(-15)}>
                <Minus size={14} />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{countdownStart}s</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustCountdown(15)}>
                <Plus size={14} />
              </Button>
            </div>
          )}

          {mode === 'rest' && !isRunning && (
            <div className="flex items-center gap-3 mt-3">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustRest(-15)}>
                <Minus size={14} />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{restStart}s</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustRest(15)}>
                <Plus size={14} />
              </Button>
            </div>
          )}

          {mode === 'tabata' && !isRunning && (
            <div className="grid grid-cols-3 gap-2 mt-3 text-center w-full">
              <div className="bg-background/30 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Trabalho</p>
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => adjustTabata('workSeconds', -5)} className="p-1 rounded bg-background/50">
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-bold w-6">{tabata.workSeconds}s</span>
                  <button onClick={() => adjustTabata('workSeconds', 5)} className="p-1 rounded bg-background/50">
                    <Plus size={10} />
                  </button>
                </div>
              </div>
              <div className="bg-background/30 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Descanso</p>
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => adjustTabata('restSeconds', -5)} className="p-1 rounded bg-background/50">
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-bold w-6">{tabata.restSeconds}s</span>
                  <button onClick={() => adjustTabata('restSeconds', 5)} className="p-1 rounded bg-background/50">
                    <Plus size={10} />
                  </button>
                </div>
              </div>
              <div className="bg-background/30 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Rounds</p>
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => adjustTabata('rounds', -1)} className="p-1 rounded bg-background/50">
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-bold w-6">{tabata.rounds}</span>
                  <button onClick={() => adjustTabata('rounds', 1)} className="p-1 rounded bg-background/50">
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="w-12 h-12 rounded-full"
          onClick={resetTimer}
        >
          <RotateCcw size={20} />
        </Button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleTimer}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
            isRunning 
              ? 'bg-yellow-500 text-yellow-950' 
              : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
          }`}
        >
          {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-0.5" />}
        </motion.button>

        <div className="w-12 h-12" />
      </div>

      {/* Compact Quick presets */}
      {(mode === 'rest' || mode === 'countdown') && !isRunning && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {[30, 45, 60, 90, 120].map((seconds) => (
            <Button
              key={seconds}
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${
                (mode === 'rest' ? restStart : countdownStart) === seconds 
                  ? 'border-primary bg-primary/10' 
                  : ''
              }`}
              onClick={() => {
                if (mode === 'rest') {
                  setRestStart(seconds);
                  setTime(seconds);
                } else {
                  setCountdownStart(seconds);
                  setTime(seconds);
                }
              }}
            >
              {seconds}s
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default WorkoutTimerPage;
