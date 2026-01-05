import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, Flame, Waves, TreePine, Zap, Sparkles, Dumbbell, Heart, Stars, Trophy } from 'lucide-react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';

interface GymButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

// Theme-specific button configurations
const getThemeConfig = (theme: SportTheme, buttonColor: 'primary' | 'secondary' | 'accent') => {
  const themeGradients: Record<SportTheme, {
    primary: { gradient: string; glow: string; ring: string };
    secondary: { gradient: string; glow: string; ring: string };
    accent: { gradient: string; glow: string; ring: string };
    shape: 'hexagon' | 'circle' | 'diamond' | 'shield' | 'octagon';
    cornerIcon: React.ReactNode;
  }> = {
    fire: {
      primary: { gradient: 'from-orange-500 via-red-600 to-red-800', glow: 'rgba(249, 115, 22, 0.6)', ring: 'ring-orange-400/40' },
      secondary: { gradient: 'from-emerald-400 via-emerald-500 to-emerald-700', glow: 'rgba(16, 185, 129, 0.6)', ring: 'ring-emerald-400/40' },
      accent: { gradient: 'from-cyan-400 via-blue-500 to-blue-700', glow: 'rgba(34, 211, 238, 0.6)', ring: 'ring-cyan-400/40' },
      shape: 'hexagon',
      cornerIcon: <Flame className="w-3 h-3" />,
    },
    ocean: {
      primary: { gradient: 'from-cyan-400 via-blue-500 to-blue-700', glow: 'rgba(6, 182, 212, 0.6)', ring: 'ring-cyan-400/40' },
      secondary: { gradient: 'from-teal-400 via-teal-500 to-teal-700', glow: 'rgba(20, 184, 166, 0.6)', ring: 'ring-teal-400/40' },
      accent: { gradient: 'from-sky-400 via-indigo-500 to-indigo-700', glow: 'rgba(56, 189, 248, 0.6)', ring: 'ring-sky-400/40' },
      shape: 'circle',
      cornerIcon: <Waves className="w-3 h-3" />,
    },
    forest: {
      primary: { gradient: 'from-emerald-400 via-green-500 to-green-700', glow: 'rgba(16, 185, 129, 0.6)', ring: 'ring-emerald-400/40' },
      secondary: { gradient: 'from-lime-400 via-lime-500 to-lime-700', glow: 'rgba(163, 230, 53, 0.6)', ring: 'ring-lime-400/40' },
      accent: { gradient: 'from-teal-400 via-emerald-500 to-emerald-700', glow: 'rgba(20, 184, 166, 0.6)', ring: 'ring-teal-400/40' },
      shape: 'shield',
      cornerIcon: <TreePine className="w-3 h-3" />,
    },
    lightning: {
      primary: { gradient: 'from-yellow-400 via-amber-500 to-orange-600', glow: 'rgba(250, 204, 21, 0.6)', ring: 'ring-yellow-400/40' },
      secondary: { gradient: 'from-orange-400 via-orange-500 to-red-600', glow: 'rgba(251, 146, 60, 0.6)', ring: 'ring-orange-400/40' },
      accent: { gradient: 'from-amber-400 via-yellow-500 to-yellow-600', glow: 'rgba(245, 158, 11, 0.6)', ring: 'ring-amber-400/40' },
      shape: 'diamond',
      cornerIcon: <Zap className="w-3 h-3" />,
    },
    galaxy: {
      primary: { gradient: 'from-purple-500 via-violet-600 to-indigo-800', glow: 'rgba(168, 85, 247, 0.6)', ring: 'ring-purple-400/40' },
      secondary: { gradient: 'from-pink-400 via-fuchsia-500 to-purple-700', glow: 'rgba(236, 72, 153, 0.6)', ring: 'ring-pink-400/40' },
      accent: { gradient: 'from-indigo-400 via-blue-500 to-violet-700', glow: 'rgba(99, 102, 241, 0.6)', ring: 'ring-indigo-400/40' },
      shape: 'octagon',
      cornerIcon: <Sparkles className="w-3 h-3" />,
    },
    iron: {
      primary: { gradient: 'from-slate-400 via-zinc-500 to-zinc-700', glow: 'rgba(148, 163, 184, 0.6)', ring: 'ring-slate-400/40' },
      secondary: { gradient: 'from-zinc-400 via-gray-500 to-gray-700', glow: 'rgba(161, 161, 170, 0.6)', ring: 'ring-zinc-400/40' },
      accent: { gradient: 'from-stone-400 via-stone-500 to-stone-700', glow: 'rgba(168, 162, 158, 0.6)', ring: 'ring-stone-400/40' },
      shape: 'hexagon',
      cornerIcon: <Dumbbell className="w-3 h-3" />,
    },
    blood: {
      primary: { gradient: 'from-red-500 via-red-600 to-rose-800', glow: 'rgba(239, 68, 68, 0.6)', ring: 'ring-red-400/40' },
      secondary: { gradient: 'from-rose-400 via-rose-500 to-red-700', glow: 'rgba(244, 63, 94, 0.6)', ring: 'ring-rose-400/40' },
      accent: { gradient: 'from-pink-500 via-rose-600 to-red-700', glow: 'rgba(236, 72, 153, 0.6)', ring: 'ring-pink-400/40' },
      shape: 'shield',
      cornerIcon: <Heart className="w-3 h-3" />,
    },
    neon: {
      primary: { gradient: 'from-pink-500 via-fuchsia-500 to-purple-700', glow: 'rgba(236, 72, 153, 0.6)', ring: 'ring-pink-400/40' },
      secondary: { gradient: 'from-violet-400 via-purple-500 to-fuchsia-700', glow: 'rgba(167, 139, 250, 0.6)', ring: 'ring-violet-400/40' },
      accent: { gradient: 'from-fuchsia-400 via-pink-500 to-rose-600', glow: 'rgba(232, 121, 249, 0.6)', ring: 'ring-fuchsia-400/40' },
      shape: 'circle',
      cornerIcon: <Stars className="w-3 h-3" />,
    },
    gold: {
      primary: { gradient: 'from-yellow-500 via-amber-500 to-orange-600', glow: 'rgba(234, 179, 8, 0.6)', ring: 'ring-yellow-400/40' },
      secondary: { gradient: 'from-amber-400 via-yellow-500 to-orange-600', glow: 'rgba(245, 158, 11, 0.6)', ring: 'ring-amber-400/40' },
      accent: { gradient: 'from-orange-400 via-amber-500 to-yellow-600', glow: 'rgba(251, 146, 60, 0.6)', ring: 'ring-orange-400/40' },
      shape: 'diamond',
      cornerIcon: <Trophy className="w-3 h-3" />,
    },
  };
  
  return {
    ...themeGradients[theme][buttonColor],
    shape: themeGradients[theme].shape,
    cornerIcon: themeGradients[theme].cornerIcon,
  };
};

// Shape clip paths
const getClipPath = (shape: 'hexagon' | 'circle' | 'diamond' | 'shield' | 'octagon') => {
  const paths = {
    hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    circle: 'circle(50% at 50% 50%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    shield: 'polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)',
    octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  };
  return paths[shape];
};

const GymButton: React.FC<GymButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound } = useAudio();
  const config = getThemeConfig(currentTheme, color);
  const clipPath = getClipPath(config.shape);
  const [isHovered, setIsHovered] = useState(false);

  // Generate random particles on hover
  const particles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i * 45) + Math.random() * 20,
      distance: 40 + Math.random() * 30,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 0.2,
      duration: 0.5 + Math.random() * 0.3,
    }));
  }, []);

  const handleHoverStart = useCallback(() => {
    if (!disabled && hoverEffectsEnabled) {
      setIsHovered(true);
      playHoverSound();
    }
  }, [disabled, hoverEffectsEnabled, playHoverSound]);

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  // Condicional para animações de hover
  const hoverScale = hoverEffectsEnabled && !disabled ? 1.08 : 1;
  const hoverY = hoverEffectsEnabled && !disabled ? -8 : 0;

  return (
    <motion.button
      key={`${currentTheme}-${color}`}
      onClick={handleClick}
      disabled={disabled}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      whileHover={{ scale: hoverScale, y: hoverY }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative flex flex-col items-center gap-3
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        group
      `}
    >
      {/* Particle explosion on hover */}
      <AnimatePresence>
        {isHovered && !disabled && hoverEffectsEnabled && (
          <>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
                  y: Math.sin(particle.angle * Math.PI / 180) * particle.distance,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-20"
                style={{ 
                  width: particle.size,
                  height: particle.size,
                  background: config.glow,
                  boxShadow: `0 0 ${particle.size * 2}px ${config.glow}`,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Floating Glow Effect - Enhanced on hover */}
      {hoverEffectsEnabled && (
        <motion.div
          className="absolute -inset-6 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-2xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${config.glow}, transparent 60%)` }}
        />
      )}
      
      {/* Ripple pulse effect on hover */}
      {hoverEffectsEnabled && (
        <motion.div
          className="absolute -inset-8 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, transparent 30%, ${config.glow} 50%, transparent 70%)`,
          }}
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0, 0.4, 0],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Main Button Container */}
      <div className="relative">
        {/* Outer Frame Glow */}
        <motion.div
          className="absolute -inset-2"
          animate={{
            boxShadow: [
              `0 0 20px ${config.glow}`,
              `0 0 40px ${config.glow}`,
              `0 0 20px ${config.glow}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            clipPath: clipPath,
            background: `linear-gradient(135deg, ${config.glow}, transparent)`,
          }}
        />

        {/* Background Plate with Shape */}
        <div 
          className="relative w-20 h-20 sm:w-24 sm:h-24"
          style={{ clipPath: clipPath }}
        >
          {/* Metal Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
          
          {/* Colored Border */}
          <div 
            className={`absolute inset-[2px] bg-gradient-to-br ${config.gradient}`}
            style={{ clipPath: clipPath }}
          />
          
          {/* Inner Dark Area */}
          <div 
            className="absolute inset-[4px] bg-gradient-to-br from-zinc-900 via-black to-zinc-900"
            style={{ clipPath: clipPath }}
          />

          {/* Center Icon Circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className={`
                relative w-14 h-14 sm:w-16 sm:h-16
                rounded-full
                bg-gradient-to-br from-zinc-800 to-black
                border-2 border-current
                flex items-center justify-center
                overflow-hidden
                ring-2 ${config.ring}
              `}
              style={{ borderColor: config.glow }}
              animate={{
                boxShadow: [
                  `0 0 15px ${config.glow}`,
                  `0 0 30px ${config.glow}`,
                  `0 0 15px ${config.glow}`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {/* Inner Glow */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Rotating Ring */}
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient}`} />
              </motion.div>

              {/* Icon - Enhanced hover effect */}
              <Icon
                className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg transition-all duration-300 ${hoverEffectsEnabled ? 'group-hover:scale-125 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]' : ''}`}
                strokeWidth={2.5}
              />

              {/* Reflection */}
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-white/5 to-transparent rounded-b-full" />
            </motion.div>
          </div>

          {/* Corner Theme Icon */}
          <motion.div
            className="absolute top-1 left-1/2 -translate-x-1/2 text-white/60"
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {config.cornerIcon}
          </motion.div>
        </div>

        {/* Side Bars - Dynamic based on shape */}
        {config.shape !== 'circle' && (
          <>
            <motion.div
              className={`
                absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full
                w-3 h-8 sm:w-4 sm:h-10
                bg-gradient-to-l ${config.gradient}
                ${config.shape === 'diamond' ? 'rounded-full' : 'rounded-l-md'}
                border-y border-l
              `}
              style={{ borderColor: config.glow }}
              animate={{
                boxShadow: [
                  `0 0 10px ${config.glow}`,
                  `0 0 20px ${config.glow}`,
                  `0 0 10px ${config.glow}`,
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className={`
                absolute right-0 top-1/2 -translate-y-1/2 translate-x-full
                w-3 h-8 sm:w-4 sm:h-10
                bg-gradient-to-r ${config.gradient}
                ${config.shape === 'diamond' ? 'rounded-full' : 'rounded-r-md'}
                border-y border-r
              `}
              style={{ borderColor: config.glow }}
              animate={{
                boxShadow: [
                  `0 0 10px ${config.glow}`,
                  `0 0 20px ${config.glow}`,
                  `0 0 10px ${config.glow}`,
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
            />
          </>
        )}
      </div>

      {/* Label - Enhanced hover effect */}
      <motion.span
        className={`font-bebas text-sm sm:text-base tracking-[0.2em] text-white/90 drop-shadow-lg transition-all duration-300 uppercase ${hoverEffectsEnabled ? 'group-hover:text-white group-hover:tracking-[0.3em] group-hover:scale-105' : ''}`}
        style={{
          textShadow: `0 0 0px transparent`,
        }}
        whileHover={hoverEffectsEnabled ? {
          textShadow: `0 0 15px ${config.glow}`,
        } : undefined}
      >
        {label}
      </motion.span>
    </motion.button>
  );
};

export default GymButton;
