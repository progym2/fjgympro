import React, { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Flame, Waves, TreePine, Zap, Sparkles, Dumbbell, Heart, Trophy, Target, Activity
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

// ============ FIRE CLOCK - Hexagonal Flame Design ============
const FireClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      {/* Hexagonal container */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-600/20 blur-xl rounded-full" />
        <svg viewBox="0 0 200 100" className="w-48 sm:w-56 h-24 sm:h-28">
          {/* Hexagonal background */}
          <polygon 
            points="20,50 40,15 160,15 180,50 160,85 40,85" 
            fill="rgba(0,0,0,0.7)"
            stroke="url(#fireGradient)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          {/* Time text */}
          <text x="100" y="58" textAnchor="middle" className="font-bebas" fill="#fb923c" fontSize="36">
            {hours}:{minutes}
          </text>
          <text x="165" y="58" textAnchor="middle" fill="#f97316" fontSize="14" opacity="0.7">
            {seconds}
          </text>
        </svg>
        <Flame className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-orange-500 animate-pulse" />
      </div>
      <span className="text-xs text-orange-400/60 uppercase tracking-widest">{date}</span>
    </div>
  );
});

FireClock.displayName = 'FireClock';

// ============ OCEAN CLOCK - Wave Circular Design ============
const OceanClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = parseInt(format(time, 'ss'));
  const date = format(time, "dd MMM", { locale: ptBR });

  const progress = (seconds / 60) * 283; // Circumference for r=45

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
        <svg viewBox="0 0 120 120" className="w-28 sm:w-32 h-28 sm:h-32">
          {/* Outer wave ring */}
          <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="3" />
          <circle 
            cx="60" cy="60" r="55" 
            fill="none" 
            stroke="url(#oceanGradient)" 
            strokeWidth="3"
            strokeDasharray={`${progress} 283`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className="transition-all duration-1000"
          />
          {/* Inner circle */}
          <circle cx="60" cy="60" r="45" fill="rgba(0,0,0,0.6)" />
          <defs>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          {/* Time */}
          <text x="60" y="55" textAnchor="middle" className="font-bebas" fill="#22d3ee" fontSize="26">
            {hours}
          </text>
          <text x="60" y="78" textAnchor="middle" className="font-bebas" fill="#67e8f9" fontSize="22">
            {minutes}
          </text>
        </svg>
        <Waves className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 text-cyan-400/60" />
      </div>
      <span className="text-xs text-cyan-400/50 capitalize">{date}</span>
    </div>
  );
});

OceanClock.displayName = 'OceanClock';

// ============ FOREST CLOCK - Organic Leaf Shape ============
const ForestClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full" />
        <svg viewBox="0 0 160 80" className="w-44 sm:w-52 h-22 sm:h-26">
          {/* Leaf-shaped container */}
          <path 
            d="M80 5 Q140 5 155 40 Q140 75 80 75 Q20 75 5 40 Q20 5 80 5"
            fill="rgba(0,0,0,0.6)"
            stroke="url(#forestGradient)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="forestGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          {/* Time */}
          <text x="80" y="48" textAnchor="middle" className="font-bebas" fill="#34d399" fontSize="32">
            {hours}:{minutes}
          </text>
        </svg>
        <div className="absolute -left-1 top-1/2 -translate-y-1/2">
          <TreePine className="w-4 h-4 text-emerald-500/60" />
        </div>
        <div className="absolute -right-1 top-1/2 -translate-y-1/2">
          <TreePine className="w-4 h-4 text-emerald-500/60" />
        </div>
      </div>
      <span className="text-xs text-emerald-500/50 capitalize">{date}</span>
    </div>
  );
});

ForestClock.displayName = 'ForestClock';

// ============ LIGHTNING CLOCK - Electric Bolt Shape ============
const LightningClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-400/30 blur-xl" style={{ animation: 'pulse 1.5s infinite' }} />
        <svg viewBox="0 0 180 90" className="w-48 sm:w-56 h-24 sm:h-28">
          {/* Angular electric shape */}
          <path 
            d="M10 45 L25 10 L90 10 L100 25 L155 10 L170 45 L155 80 L100 65 L90 80 L25 80 Z"
            fill="rgba(0,0,0,0.85)"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          {/* Inner glow */}
          <path 
            d="M10 45 L25 10 L90 10 L100 25 L155 10 L170 45 L155 80 L100 65 L90 80 L25 80 Z"
            fill="none"
            stroke="rgba(251,191,36,0.3)"
            strokeWidth="6"
            filter="blur(4px)"
          />
          {/* Time */}
          <text x="90" y="55" textAnchor="middle" className="font-bebas" fill="#fcd34d" fontSize="30">
            {hours}⚡{minutes}
          </text>
          <text x="150" y="52" textAnchor="middle" fill="#fbbf24" fontSize="14" opacity="0.6">
            {seconds}
          </text>
        </svg>
        <Zap className="absolute -top-3 right-4 w-5 h-5 text-yellow-400 animate-pulse" fill="currentColor" />
      </div>
    </div>
  );
});

LightningClock.displayName = 'LightningClock';

// ============ GALAXY CLOCK - Cosmic Orbital Design ============
const GalaxyClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = parseInt(format(time, 'ss'));
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
        <svg viewBox="0 0 140 100" className="w-40 sm:w-48 h-28 sm:h-32">
          {/* Elliptical orbit rings */}
          <ellipse cx="70" cy="50" rx="65" ry="35" fill="none" stroke="rgba(192,132,252,0.3)" strokeWidth="1" strokeDasharray="4 4" />
          <ellipse cx="70" cy="50" rx="50" ry="25" fill="none" stroke="rgba(192,132,252,0.2)" strokeWidth="1" />
          {/* Central planet */}
          <ellipse cx="70" cy="50" rx="38" ry="28" fill="rgba(0,0,0,0.7)" stroke="url(#galaxyGradient)" strokeWidth="2" />
          {/* Orbiting dot */}
          <circle 
            cx={70 + Math.cos((seconds * 6 - 90) * Math.PI / 180) * 55} 
            cy={50 + Math.sin((seconds * 6 - 90) * Math.PI / 180) * 30} 
            r="4" 
            fill="#c084fc"
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="galaxyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Time */}
          <text x="70" y="56" textAnchor="middle" className="font-bebas" fill="#c084fc" fontSize="28">
            {hours}:{minutes}
          </text>
        </svg>
        <Sparkles className="absolute top-0 right-2 w-4 h-4 text-purple-400 animate-pulse" />
        <Sparkles className="absolute bottom-2 left-2 w-3 h-3 text-fuchsia-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      <span className="text-xs text-purple-400/60 capitalize">{date}</span>
    </div>
  );
});

GalaxyClock.displayName = 'GalaxyClock';

// ============ IRON CLOCK - Industrial Gauge Design ============
const IronClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        <svg viewBox="0 0 180 90" className="w-48 sm:w-56 h-24 sm:h-28">
          {/* Industrial frame with rivets */}
          <rect x="5" y="10" width="170" height="70" rx="8" fill="rgba(30,30,35,0.9)" stroke="#64748b" strokeWidth="3" />
          {/* Corner rivets */}
          <circle cx="18" cy="22" r="4" fill="#475569" />
          <circle cx="162" cy="22" r="4" fill="#475569" />
          <circle cx="18" cy="68" r="4" fill="#475569" />
          <circle cx="162" cy="68" r="4" fill="#475569" />
          {/* Display panel */}
          <rect x="20" y="25" width="140" height="40" rx="4" fill="rgba(0,0,0,0.5)" stroke="#475569" strokeWidth="1" />
          {/* Time - LED style */}
          <text x="90" y="53" textAnchor="middle" fontFamily="monospace" fill="#94a3b8" fontSize="28" fontWeight="bold">
            {hours}:{minutes}:{seconds}
          </text>
        </svg>
        <Dumbbell className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 text-zinc-500" />
      </div>
    </div>
  );
});

IronClock.displayName = 'IronClock';

// ============ BLOOD CLOCK - Heart Rate Monitor Shape ============
const BloodClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "dd/MM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
        <svg viewBox="0 0 160 90" className="w-44 sm:w-52 h-24 sm:h-28">
          {/* Heart rate line background */}
          <path 
            d="M0 45 L30 45 L40 45 L50 20 L60 70 L70 30 L80 50 L90 45 L160 45"
            fill="none"
            stroke="rgba(239,68,68,0.3)"
            strokeWidth="2"
          />
          {/* Main container - rounded organic */}
          <rect x="25" y="15" width="110" height="60" rx="20" fill="rgba(0,0,0,0.7)" stroke="url(#bloodGradient)" strokeWidth="2" />
          <defs>
            <linearGradient id="bloodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          {/* Time */}
          <text x="80" y="52" textAnchor="middle" className="font-bebas" fill="#f87171" fontSize="30">
            {hours}:{minutes}
          </text>
        </svg>
        <Heart className="absolute -left-1 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
        <Activity className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
      </div>
      <span className="text-xs text-red-500/50">{date}</span>
    </div>
  );
});

BloodClock.displayName = 'BloodClock';

// ============ NEON CLOCK - Cyberpunk Diamond Shape ============
const NeonClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-pink-500/30 blur-xl" />
        <div className="absolute inset-0 bg-cyan-400/20 blur-2xl" />
        <svg viewBox="0 0 160 100" className="w-44 sm:w-52 h-28 sm:h-32">
          {/* Diamond shape with neon glow */}
          <polygon 
            points="80,5 155,50 80,95 5,50"
            fill="rgba(0,0,0,0.85)"
            stroke="url(#neonGradient)"
            strokeWidth="2"
          />
          {/* Outer glow layer */}
          <polygon 
            points="80,5 155,50 80,95 5,50"
            fill="none"
            stroke="rgba(236,72,153,0.4)"
            strokeWidth="8"
            filter="blur(6px)"
          />
          {/* Inner lines */}
          <line x1="80" y1="25" x2="80" y2="75" stroke="rgba(236,72,153,0.3)" strokeWidth="1" />
          <line x1="30" y1="50" x2="130" y2="50" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
          <defs>
            <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          {/* Time */}
          <text x="80" y="45" textAnchor="middle" className="font-bebas" fill="#f472b6" fontSize="24"
            style={{ filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.8))' }}>
            {hours}
          </text>
          <text x="80" y="68" textAnchor="middle" className="font-bebas" fill="#22d3ee" fontSize="20"
            style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.8))' }}>
            {minutes}
          </text>
          <text x="135" y="55" textAnchor="middle" fill="#a855f7" fontSize="12" opacity="0.8">
            {seconds}
          </text>
        </svg>
      </div>
    </div>
  );
});

NeonClock.displayName = 'NeonClock';

// ============ GOLD CLOCK - Trophy Shield Design ============
const GoldClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-400/20 blur-xl" />
        <svg viewBox="0 0 140 110" className="w-38 sm:w-44 h-30 sm:h-34">
          {/* Shield/Trophy shape */}
          <path 
            d="M70 5 L130 20 L125 60 Q110 100 70 105 Q30 100 15 60 L10 20 Z"
            fill="rgba(0,0,0,0.7)"
            stroke="url(#goldGradient)"
            strokeWidth="3"
          />
          {/* Inner accent */}
          <path 
            d="M70 18 L115 30 L112 58 Q100 88 70 92 Q40 88 28 58 L25 30 Z"
            fill="none"
            stroke="rgba(234,179,8,0.3)"
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          {/* Trophy icon */}
          <text x="70" y="40" textAnchor="middle" fill="#fcd34d" fontSize="16">🏆</text>
          {/* Time */}
          <text x="70" y="70" textAnchor="middle" className="font-bebas" fill="#fcd34d" fontSize="28">
            {hours}:{minutes}
          </text>
        </svg>
      </div>
      <span className="text-xs text-yellow-500/50 capitalize font-medium">{date}</span>
    </div>
  );
});

GoldClock.displayName = 'GoldClock';

// ============ AMOLED CLOCK - Minimal Arc Design ============
const AmoledClock: React.FC<{ time: Date }> = memo(({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = parseInt(format(time, 'ss'));
  const date = format(time, "EEE, dd MMM", { locale: ptBR });

  const hourProgress = (parseInt(hours) % 12 / 12) * 226;
  const minProgress = (parseInt(minutes) / 60) * 226;

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-28 sm:w-32 h-28 sm:h-32">
          {/* Outer arc - hours */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(75,85,99,0.2)" strokeWidth="4" />
          <circle 
            cx="50" cy="50" r="45" 
            fill="none" 
            stroke="rgba(156,163,175,0.6)" 
            strokeWidth="4"
            strokeDasharray={`${hourProgress} 283`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          {/* Inner arc - minutes */}
          <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(75,85,99,0.15)" strokeWidth="3" />
          <circle 
            cx="50" cy="50" r="36" 
            fill="none" 
            stroke="rgba(107,114,128,0.5)" 
            strokeWidth="3"
            strokeDasharray={`${minProgress} 226`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          {/* Center */}
          <circle cx="50" cy="50" r="28" fill="rgba(0,0,0,0.3)" />
          {/* Time */}
          <text x="50" y="46" textAnchor="middle" className="font-bebas" fill="#e5e7eb" fontSize="20">
            {hours}
          </text>
          <text x="50" y="62" textAnchor="middle" className="font-bebas" fill="#9ca3af" fontSize="16">
            {minutes}
          </text>
        </svg>
        {/* Seconds indicator */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-600">
          {seconds}s
        </div>
      </div>
      <span className="text-xs text-gray-600 uppercase tracking-widest">{date}</span>
    </div>
  );
});

AmoledClock.displayName = 'AmoledClock';

export default DigitalClock;
