import React, { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Flame, Waves, TreePine, Zap, Sparkles, Dumbbell, Heart, Stars, Trophy,
  Timer, Activity, Target, Gauge, TrendingUp, Battery, Footprints
} from 'lucide-react';

const DigitalClock: React.FC = memo(() => {
  const [time, setTime] = useState(new Date());
  const { currentTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  switch (currentTheme) {
    case 'fire':
      return <FireClock time={time} />;
    case 'ocean':
      return <OceanClock time={time} />;
    case 'forest':
      return <ForestClock time={time} />;
    case 'lightning':
      return <LightningClock time={time} />;
    case 'galaxy':
      return <GalaxyClock time={time} />;
    case 'iron':
      return <IronClock time={time} />;
    case 'blood':
      return <BloodClock time={time} />;
    case 'neon':
      return <NeonClock time={time} />;
    case 'gold':
      return <GoldClock time={time} />;
    case 'amoled':
      return <AmoledClock time={time} />;
    default:
      return <FireClock time={time} />;
  }
});

DigitalClock.displayName = 'DigitalClock';

// ============ FIRE CLOCK - Burning Intensity Workout Timer ============
const FireClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      {/* Main timer display */}
      <div className="relative">
        {/* Outer ring glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/30 via-red-500/20 to-orange-600/30 blur-xl animate-pulse" />
        
        <div className="relative flex items-center gap-2 bg-gradient-to-br from-black/90 via-zinc-900/95 to-black/90 px-6 py-4 rounded-2xl border border-orange-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          {/* Burn icon with animation */}
          <div className="flex flex-col items-center mr-3">
            <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            <span className="text-[8px] text-orange-400/60 uppercase tracking-wider mt-1">burn</span>
          </div>
          
          {/* Time segments */}
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-bebas text-orange-400 tracking-wider leading-none"
                style={{ textShadow: '0 0 20px rgba(251,146,60,0.5)' }}>
                {hours}
              </span>
              <span className="text-[8px] text-orange-500/50 uppercase">hrs</span>
            </div>
            
            <div className="flex flex-col items-center mx-2">
              <span className="text-3xl sm:text-4xl text-orange-500 font-bold animate-pulse leading-none">:</span>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-bebas text-orange-400 tracking-wider leading-none"
                style={{ textShadow: '0 0 20px rgba(251,146,60,0.5)' }}>
                {minutes}
              </span>
              <span className="text-[8px] text-orange-500/50 uppercase">min</span>
            </div>
            
            <div className="flex flex-col items-center ml-3">
              <span className="text-xl sm:text-2xl font-bebas text-orange-600/70 leading-none">
                {seconds}
              </span>
              <span className="text-[8px] text-orange-600/40 uppercase">sec</span>
            </div>
          </div>
          
          {/* Intensity indicator */}
          <div className="flex flex-col items-center ml-3 gap-1">
            <Activity className="w-4 h-4 text-orange-500" />
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className={`w-1 h-2 rounded-full ${i <= 4 ? 'bg-orange-500' : 'bg-zinc-700'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <span className="text-xs text-orange-400/60 uppercase tracking-widest font-medium">{date}</span>
    </div>
  );
});

FireClock.displayName = 'FireClock';

// ============ OCEAN CLOCK - Swim/Cardio Flow Meter ============
const OceanClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "dd MMM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Water effect glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-cyan-400/20 to-blue-600/30 blur-lg" />
        
        <div className="relative bg-gradient-to-b from-slate-900/95 via-cyan-950/90 to-slate-900/95 backdrop-blur-md rounded-3xl px-6 py-4 border border-cyan-500/30 overflow-hidden">
          {/* Wave animation background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-cyan-500/30 to-transparent animate-pulse" />
          </div>
          
          <div className="relative flex items-center gap-4">
            {/* Lap counter style */}
            <div className="flex flex-col items-center">
              <Waves className="w-5 h-5 text-cyan-400" />
              <span className="text-[8px] text-cyan-400/50 uppercase mt-1">flow</span>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-5xl sm:text-6xl font-bebas text-cyan-300 tracking-tight"
                style={{ textShadow: '0 0 30px rgba(34,211,238,0.4)' }}>
                {hours}
              </span>
              <span className="text-3xl sm:text-4xl text-cyan-500/60 animate-pulse">:</span>
              <span className="text-5xl sm:text-6xl font-bebas text-cyan-300 tracking-tight"
                style={{ textShadow: '0 0 30px rgba(34,211,238,0.4)' }}>
                {minutes}
              </span>
            </div>
            
            {/* Seconds with progress ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="2" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(34,211,238,0.8)" strokeWidth="2"
                    strokeDasharray={`${(parseInt(seconds) / 60) * 100.5} 100.5`}
                    strokeLinecap="round" />
                </svg>
                <span className="text-sm font-bebas text-cyan-400">{seconds}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Footprints className="w-3 h-3 text-cyan-400/40" />
        <span className="text-xs text-cyan-400/50 uppercase tracking-wider">{date}</span>
      </div>
    </div>
  );
});

OceanClock.displayName = 'OceanClock';

// ============ FOREST CLOCK - Endurance Trail Timer ============
const ForestClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Nature glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 blur-lg" />
        
        <div className="relative bg-gradient-to-br from-zinc-900/95 via-emerald-950/80 to-zinc-900/95 px-6 py-4 rounded-2xl border border-emerald-500/30">
          <div className="flex items-center gap-4">
            {/* Trail/Nature icon */}
            <div className="flex flex-col items-center">
              <TreePine className="w-5 h-5 text-emerald-500" />
              <span className="text-[8px] text-emerald-500/50 uppercase mt-1">trail</span>
            </div>
            
            {/* Digital display with organic feel */}
            <div className="flex items-center bg-black/40 rounded-xl px-4 py-2 border border-emerald-600/20">
              <span className="text-5xl sm:text-6xl font-bebas text-emerald-400 tracking-tight"
                style={{ textShadow: '0 0 15px rgba(52,211,153,0.3)' }}>
                {hours}
              </span>
              <div className="flex flex-col mx-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mb-1" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-5xl sm:text-6xl font-bebas text-emerald-400 tracking-tight"
                style={{ textShadow: '0 0 15px rgba(52,211,153,0.3)' }}>
                {minutes}
              </span>
            </div>
            
            {/* Endurance meter */}
            <div className="flex flex-col items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <div className="h-8 w-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="w-full h-3/4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <span className="text-xs text-emerald-500/50 capitalize tracking-wide">{date}</span>
    </div>
  );
});

ForestClock.displayName = 'ForestClock';

// ============ LIGHTNING CLOCK - HIIT Power Display ============
const LightningClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        {/* Electric glow */}
        <div className="absolute inset-0 bg-yellow-400/20 blur-xl animate-pulse" />
        
        <div className="relative bg-black/95 px-6 py-4 border-2 border-yellow-400/60 shadow-[0_0_30px_rgba(250,204,21,0.3),inset_0_0_20px_rgba(250,204,21,0.1)]">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-400" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-400" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-400" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-400" />
          
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-400 animate-pulse" fill="currentColor" />
            
            <div className="flex items-center">
              <div className="flex flex-col items-center">
                <span className="text-4xl sm:text-5xl font-bebas text-yellow-300 tracking-widest"
                  style={{ textShadow: '0 0 15px rgba(250,204,21,0.8)' }}>
                  {hours}
                </span>
                <span className="text-[8px] text-yellow-500/60 uppercase">power</span>
              </div>
              
              <span className="text-3xl text-yellow-400 mx-2 animate-pulse font-bold">⚡</span>
              
              <div className="flex flex-col items-center">
                <span className="text-4xl sm:text-5xl font-bebas text-yellow-300 tracking-widest"
                  style={{ textShadow: '0 0 15px rgba(250,204,21,0.8)' }}>
                  {minutes}
                </span>
                <span className="text-[8px] text-yellow-500/60 uppercase">burst</span>
              </div>
              
              <div className="ml-3 flex flex-col items-center">
                <span className="text-xl font-bebas text-yellow-500/80">{seconds}</span>
                <span className="text-[8px] text-yellow-600/50 uppercase">sec</span>
              </div>
            </div>
            
            <Gauge className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
      </div>
    </div>
  );
});

LightningClock.displayName = 'LightningClock';

// ============ GALAXY CLOCK - Cosmic Fitness Journey ============
const GalaxyClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Cosmic glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 via-fuchsia-500/20 to-purple-500/30 blur-xl" />
        
        <div className="relative bg-gradient-to-br from-purple-950/95 via-fuchsia-950/80 to-purple-950/95 backdrop-blur-md rounded-full px-8 py-5 border border-purple-500/40 overflow-hidden">
          {/* Stars background */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{ 
                  left: `${15 + i * 15}%`, 
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.2}s`
                }} />
            ))}
          </div>
          
          <div className="relative flex items-center gap-4">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            
            <div className="flex items-baseline gap-1">
              <span className="text-5xl sm:text-6xl font-bebas text-purple-300"
                style={{ textShadow: '0 0 25px rgba(192,132,252,0.6)' }}>
                {hours}
              </span>
              <span className="text-4xl text-fuchsia-400/60">:</span>
              <span className="text-5xl sm:text-6xl font-bebas text-purple-300"
                style={{ textShadow: '0 0 25px rgba(192,132,252,0.6)' }}>
                {minutes}
              </span>
              <span className="text-xl text-purple-500/60 ml-2">{seconds}</span>
            </div>
            
            <Target className="w-5 h-5 text-fuchsia-400" />
          </div>
        </div>
      </div>
      
      <span className="text-xs text-purple-400/60 capitalize tracking-wider">{date}</span>
    </div>
  );
});

GalaxyClock.displayName = 'GalaxyClock';

// ============ IRON CLOCK - Heavy Lifting Rep Counter Style ============
const IronClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        {/* Metal texture effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-600/20 to-zinc-800/20 blur-sm" />
        
        <div className="relative bg-gradient-to-b from-zinc-800/95 via-zinc-900/98 to-zinc-800/95 px-6 py-4 border-2 border-zinc-600/60 rounded-lg shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.3)]">
          {/* Weight plate inspired design */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <Dumbbell className="w-6 h-6 text-zinc-400" />
              <span className="text-[8px] text-zinc-500 uppercase mt-1">iron</span>
            </div>
            
            {/* LED-style digits */}
            <div className="bg-black/60 px-4 py-2 rounded border border-zinc-700/50">
              <div className="flex items-center font-mono">
                <span className="text-4xl sm:text-5xl text-zinc-200 font-bold tracking-wider"
                  style={{ fontFamily: 'monospace' }}>
                  {hours}
                </span>
                <span className="text-3xl text-zinc-500 mx-1 animate-pulse">:</span>
                <span className="text-4xl sm:text-5xl text-zinc-200 font-bold tracking-wider"
                  style={{ fontFamily: 'monospace' }}>
                  {minutes}
                </span>
                <div className="ml-2 pl-2 border-l border-zinc-700">
                  <span className="text-xl text-zinc-500 font-mono">{seconds}</span>
                </div>
              </div>
            </div>
            
            {/* Rep counter style indicator */}
            <div className="flex flex-col items-center gap-1">
              <div className="grid grid-cols-2 gap-0.5">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-sm bg-zinc-500" />
                ))}
              </div>
              <span className="text-[8px] text-zinc-500 uppercase">sets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IronClock.displayName = 'IronClock';

// ============ BLOOD CLOCK - Heart Rate Monitor Style ============
const BloodClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "dd/MM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Pulse glow */}
        <div className="absolute inset-0 rounded-2xl bg-red-500/20 blur-lg animate-pulse" />
        
        <div className="relative bg-gradient-to-br from-zinc-900/95 via-red-950/60 to-zinc-900/95 px-6 py-4 rounded-2xl border border-red-500/40 overflow-hidden">
          {/* ECG line animation */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/20">
            <div className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent animate-pulse" />
          </div>
          
          <div className="relative flex items-center gap-4">
            {/* Heartbeat icon */}
            <div className="flex flex-col items-center">
              <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />
              <span className="text-[8px] text-red-400/50 uppercase mt-1">bpm</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-5xl sm:text-6xl font-bebas text-red-400 tracking-wider"
                style={{ textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
                {hours}
              </span>
              <span className="text-4xl text-red-500 mx-1 animate-pulse">:</span>
              <span className="text-5xl sm:text-6xl font-bebas text-red-400 tracking-wider"
                style={{ textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
                {minutes}
              </span>
            </div>
            
            {/* Seconds as heart rate style */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-bebas text-red-500/70">{seconds}</span>
              <Activity className="w-4 h-4 text-red-500/60" />
            </div>
          </div>
        </div>
      </div>
      
      <span className="text-xs text-red-500/50 uppercase tracking-wider">{date}</span>
    </div>
  );
});

BloodClock.displayName = 'BloodClock';

// ============ NEON CLOCK - Cyberpunk Fitness HUD ============
const NeonClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        {/* Neon glow effect */}
        <div className="absolute inset-0 bg-pink-500/20 blur-xl" />
        <div className="absolute inset-0 bg-cyan-400/10 blur-2xl" />
        
        <div className="relative bg-black/95 px-6 py-4 rounded-lg border border-pink-500/50 shadow-[0_0_40px_rgba(236,72,153,0.3),0_0_80px_rgba(34,211,238,0.1)]">
          {/* HUD corners */}
          <div className="absolute top-1 left-1 w-4 h-4 border-t border-l border-cyan-400/60" />
          <div className="absolute top-1 right-1 w-4 h-4 border-t border-r border-cyan-400/60" />
          <div className="absolute bottom-1 left-1 w-4 h-4 border-b border-l border-pink-500/60" />
          <div className="absolute bottom-1 right-1 w-4 h-4 border-b border-r border-pink-500/60" />
          
          <div className="flex items-center gap-4">
            <Stars className="w-5 h-5 text-pink-400" />
            
            <div className="flex items-center">
              <span className="text-5xl sm:text-6xl font-bebas text-pink-400"
                style={{ textShadow: '0 0 30px rgba(236,72,153,0.8), 0 0 60px rgba(236,72,153,0.4)' }}>
                {hours}
              </span>
              <div className="flex flex-col mx-2 gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              </div>
              <span className="text-5xl sm:text-6xl font-bebas text-pink-400"
                style={{ textShadow: '0 0 30px rgba(236,72,153,0.8), 0 0 60px rgba(236,72,153,0.4)' }}>
                {minutes}
              </span>
              <span className="text-2xl font-bebas text-cyan-400/80 ml-2"
                style={{ textShadow: '0 0 15px rgba(34,211,238,0.6)' }}>
                {seconds}
              </span>
            </div>
            
            <Timer className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
});

NeonClock.displayName = 'NeonClock';

// ============ GOLD CLOCK - Champion Trophy Timer ============
const GoldClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Gold shimmer glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-300/30 to-yellow-400/20 blur-xl animate-pulse" />
        
        <div className="relative bg-gradient-to-b from-amber-950/80 via-yellow-950/90 to-amber-950/80 backdrop-blur-md px-7 py-4 rounded-2xl border border-yellow-500/50 shadow-[inset_0_1px_0_0_rgba(255,215,0,0.2)]">
          {/* Luxury accent lines */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
          <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
          
          <div className="flex items-center gap-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            
            <div className="flex items-baseline">
              <span className="text-5xl sm:text-6xl font-bebas text-yellow-400 tracking-wide"
                style={{ textShadow: '0 0 20px rgba(234,179,8,0.5)' }}>
                {hours}
              </span>
              <span className="text-4xl text-yellow-500/60 mx-1">:</span>
              <span className="text-5xl sm:text-6xl font-bebas text-yellow-400 tracking-wide"
                style={{ textShadow: '0 0 20px rgba(234,179,8,0.5)' }}>
                {minutes}
              </span>
              <span className="text-xl text-yellow-600/70 ml-2">{seconds}</span>
            </div>
            
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
      </div>
      
      <span className="text-xs text-yellow-500/50 capitalize tracking-wider font-medium">{date}</span>
    </div>
  );
});

GoldClock.displayName = 'GoldClock';

// ============ AMOLED CLOCK - Minimal Fitness Watch ============
const AmoledClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "EEE, dd MMM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      {/* Minimalist fitness watch design */}
      <div className="flex items-center gap-6">
        {/* Activity ring */}
        <div className="relative w-12 h-12">
          <svg className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4"
              strokeDasharray="94 126" strokeLinecap="round" />
          </svg>
          <Battery className="absolute inset-0 m-auto w-4 h-4 text-gray-400" />
        </div>
        
        {/* Time display */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline">
            <span className="text-6xl sm:text-7xl font-bebas text-gray-100 tracking-tight">
              {hours}
            </span>
            <span className="text-5xl sm:text-6xl text-gray-500 font-light">:</span>
            <span className="text-6xl sm:text-7xl font-bebas text-gray-100 tracking-tight">
              {minutes}
            </span>
          </div>
          <span className="text-sm text-gray-500 uppercase tracking-widest">{seconds}s</span>
        </div>
        
        {/* Steps indicator */}
        <div className="relative w-12 h-12">
          <svg className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4"
              strokeDasharray="75 126" strokeLinecap="round" />
          </svg>
          <Footprints className="absolute inset-0 m-auto w-4 h-4 text-gray-500" />
        </div>
      </div>
      
      <span className="text-xs text-gray-600 uppercase tracking-widest">{date}</span>
    </div>
  );
});

AmoledClock.displayName = 'AmoledClock';

export default DigitalClock;
