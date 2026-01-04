import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { Flame, Waves, TreePine, Zap, Sparkles, Dumbbell, Heart, Stars, Trophy } from 'lucide-react';

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { currentTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Render different clock styles based on theme
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
    default:
      return <FireClock time={time} />;
  }
};

// ============ FIRE CLOCK - Angular LED Display ============
const FireClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "EEEE, dd MMM", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex items-center gap-1 bg-black/80 px-4 py-2 border-l-4 border-orange-500">
        <span className="text-4xl sm:text-5xl font-bebas text-orange-400 tracking-widest">
          {hours}
        </span>
        <motion.span 
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-3xl sm:text-4xl text-orange-500 font-bold"
        >:</motion.span>
        <span className="text-4xl sm:text-5xl font-bebas text-orange-400 tracking-widest">
          {minutes}
        </span>
        <Flame className="w-5 h-5 text-orange-500 ml-2" />
      </div>
      <span className="text-xs text-orange-300/70 uppercase tracking-wider">{date}</span>
    </motion.div>
  );
};

// ============ OCEAN CLOCK - Fluid Wave Style ============
const OceanClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const date = format(time, "EEEE, dd MMM", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative bg-gradient-to-b from-cyan-900/40 to-blue-900/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-cyan-500/30">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-bebas text-cyan-300">{hours}</span>
          <span className="text-2xl sm:text-3xl text-cyan-400/60">:</span>
          <span className="text-4xl sm:text-5xl font-bebas text-cyan-300">{minutes}</span>
          <span className="text-lg sm:text-xl text-cyan-500/50 ml-1">{seconds}</span>
        </div>
        <Waves className="absolute -right-2 -top-2 w-4 h-4 text-cyan-400/60" />
      </div>
      <span className="text-xs text-cyan-400/60 capitalize">{date}</span>
    </motion.div>
  );
};

// ============ FOREST CLOCK - Organic Minimal ============
const ForestClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "dd 'de' MMMM", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="flex items-center gap-3">
        <TreePine className="w-4 h-4 text-emerald-500/60" />
        <div className="flex items-center">
          <span className="text-5xl sm:text-6xl font-bebas text-emerald-400 tracking-tight">{hours}</span>
          <motion.span 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl sm:text-5xl text-emerald-600 mx-1"
          >•</motion.span>
          <span className="text-5xl sm:text-6xl font-bebas text-emerald-400 tracking-tight">{minutes}</span>
        </div>
        <TreePine className="w-4 h-4 text-emerald-500/60" />
      </div>
      <span className="text-xs text-emerald-500/50 capitalize">{date}</span>
    </motion.div>
  );
};

// ============ LIGHTNING CLOCK - Electric Glitch ============
const LightningClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <div className="flex items-center bg-black/90 px-4 py-2 border border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
          <Zap className="w-4 h-4 text-yellow-400 mr-2" />
          <span className="text-4xl sm:text-5xl font-bebas text-yellow-300 tracking-widest">{hours}</span>
          <motion.span 
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-3xl text-yellow-400 mx-1"
          >:</motion.span>
          <span className="text-4xl sm:text-5xl font-bebas text-yellow-300 tracking-widest">{minutes}</span>
          <span className="text-xl text-yellow-500/60 ml-2">{seconds}</span>
        </div>
        {/* Electric flicker effect */}
        <motion.div
          className="absolute inset-0 bg-yellow-400/10"
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 2 }}
        />
      </div>
    </motion.div>
  );
};

// ============ GALAXY CLOCK - Cosmic Glow ============
const GalaxyClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <motion.div
          className="absolute -inset-4 rounded-full bg-purple-500/20 blur-xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative bg-purple-950/60 backdrop-blur-md rounded-xl px-5 py-3 border border-purple-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-4xl sm:text-5xl font-bebas text-purple-300">{hours}:{minutes}</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>
      <span className="text-xs text-purple-400/60 capitalize">{date}</span>
    </motion.div>
  );
};

// ============ IRON CLOCK - Industrial Digital ============
const IronClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div className="bg-zinc-800/90 border-2 border-zinc-600 px-5 py-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-zinc-500" />
          <div className="font-mono">
            <span className="text-3xl sm:text-4xl text-zinc-300">{hours}</span>
            <span className="text-2xl sm:text-3xl text-zinc-500">:</span>
            <span className="text-3xl sm:text-4xl text-zinc-300">{minutes}</span>
            <span className="text-xl text-zinc-600 ml-1">:{seconds}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============ BLOOD CLOCK - Intense Pulse ============
const BloodClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "dd/MM", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="flex items-center gap-2 bg-red-950/50 px-5 py-2 border-l-4 border-r-4 border-red-600">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
        </motion.div>
        <span className="text-4xl sm:text-5xl font-bebas text-red-400 tracking-widest">{hours}:{minutes}</span>
      </div>
      <span className="text-xs text-red-500/50">{date}</span>
    </motion.div>
  );
};

// ============ NEON CLOCK - Cyberpunk Glow ============
const NeonClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      <div className="relative bg-black/80 rounded-lg px-5 py-3 border border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.4)]">
        <div className="flex items-center">
          <motion.span 
            className="text-4xl sm:text-5xl font-bebas text-pink-400"
            style={{ textShadow: '0 0 20px rgba(236,72,153,0.8)' }}
          >
            {hours}
          </motion.span>
          <motion.span 
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-3xl text-pink-500 mx-1"
          >:</motion.span>
          <motion.span 
            className="text-4xl sm:text-5xl font-bebas text-pink-400"
            style={{ textShadow: '0 0 20px rgba(236,72,153,0.8)' }}
          >
            {minutes}
          </motion.span>
          <span className="text-lg text-fuchsia-500/60 ml-2">{seconds}</span>
        </div>
        <Stars className="absolute -top-2 -right-2 w-4 h-4 text-pink-400" />
      </div>
    </motion.div>
  );
};

// ============ GOLD CLOCK - Luxury Elegant ============
const GoldClock: React.FC<{ time: Date }> = ({ time }) => {
  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const date = format(time, "EEEE", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative bg-gradient-to-b from-amber-900/40 to-yellow-900/30 backdrop-blur-sm rounded-xl px-6 py-3 border border-yellow-500/40">
        <div className="flex items-center gap-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-4xl sm:text-5xl font-bebas text-yellow-400 tracking-wide">
            {hours}:{minutes}
          </span>
          <Trophy className="w-4 h-4 text-yellow-500" />
        </div>
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <span className="text-xs text-yellow-500/50 capitalize">{date}</span>
    </motion.div>
  );
};

export default DigitalClock;