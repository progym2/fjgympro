import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import { LucideIcon, Dumbbell, User, Shield, Heart, Flame, Waves, TreePine, Zap, Sparkles, Trophy, Target, Activity, Crown } from 'lucide-react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemedHomeButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

interface RippleType {
  id: number;
  x: number;
  y: number;
}

// Cores do tema para cada botão
const getThemeColors = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent') => {
  const themeColors: Record<SportTheme, Record<string, { main: string; glow: string; text: string; border: string; accent: string }>> = {
    fire: {
      primary: { main: 'from-orange-500 to-red-600', glow: 'rgba(255,107,53,0.5)', text: 'text-orange-100', border: 'border-orange-400/50', accent: '#ff6b35' },
      secondary: { main: 'from-emerald-500 to-teal-600', glow: 'rgba(16,185,129,0.5)', text: 'text-emerald-100', border: 'border-emerald-400/50', accent: '#10b981' },
      accent: { main: 'from-blue-500 to-indigo-600', glow: 'rgba(59,130,246,0.5)', text: 'text-blue-100', border: 'border-blue-400/50', accent: '#3b82f6' },
    },
    ocean: {
      primary: { main: 'from-cyan-400 to-blue-600', glow: 'rgba(34,211,238,0.5)', text: 'text-cyan-100', border: 'border-cyan-400/50', accent: '#22d3ee' },
      secondary: { main: 'from-teal-400 to-cyan-600', glow: 'rgba(20,184,166,0.5)', text: 'text-teal-100', border: 'border-teal-400/50', accent: '#14b8a6' },
      accent: { main: 'from-indigo-400 to-purple-600', glow: 'rgba(129,140,248,0.5)', text: 'text-indigo-100', border: 'border-indigo-400/50', accent: '#818cf8' },
    },
    forest: {
      primary: { main: 'from-emerald-400 to-green-600', glow: 'rgba(52,211,153,0.5)', text: 'text-emerald-100', border: 'border-emerald-400/50', accent: '#34d399' },
      secondary: { main: 'from-lime-400 to-green-600', glow: 'rgba(163,230,53,0.5)', text: 'text-lime-100', border: 'border-lime-400/50', accent: '#a3e635' },
      accent: { main: 'from-teal-400 to-emerald-600', glow: 'rgba(45,212,191,0.5)', text: 'text-teal-100', border: 'border-teal-400/50', accent: '#2dd4bf' },
    },
    lightning: {
      primary: { main: 'from-yellow-400 to-amber-600', glow: 'rgba(251,191,36,0.5)', text: 'text-yellow-100', border: 'border-yellow-400/50', accent: '#fbbf24' },
      secondary: { main: 'from-orange-400 to-amber-600', glow: 'rgba(251,146,60,0.5)', text: 'text-orange-100', border: 'border-orange-400/50', accent: '#fb923c' },
      accent: { main: 'from-red-400 to-orange-600', glow: 'rgba(248,113,113,0.5)', text: 'text-red-100', border: 'border-red-400/50', accent: '#f87171' },
    },
    galaxy: {
      primary: { main: 'from-purple-400 to-violet-600', glow: 'rgba(192,132,252,0.5)', text: 'text-purple-100', border: 'border-purple-400/50', accent: '#c084fc' },
      secondary: { main: 'from-pink-400 to-purple-600', glow: 'rgba(244,114,182,0.5)', text: 'text-pink-100', border: 'border-pink-400/50', accent: '#f472b6' },
      accent: { main: 'from-indigo-400 to-blue-600', glow: 'rgba(129,140,248,0.5)', text: 'text-indigo-100', border: 'border-indigo-400/50', accent: '#818cf8' },
    },
    iron: {
      primary: { main: 'from-slate-400 to-zinc-600', glow: 'rgba(148,163,184,0.4)', text: 'text-slate-100', border: 'border-slate-400/50', accent: '#94a3b8' },
      secondary: { main: 'from-zinc-400 to-slate-600', glow: 'rgba(161,161,170,0.4)', text: 'text-zinc-100', border: 'border-zinc-400/50', accent: '#a1a1aa' },
      accent: { main: 'from-gray-400 to-zinc-600', glow: 'rgba(156,163,175,0.4)', text: 'text-gray-100', border: 'border-gray-400/50', accent: '#9ca3af' },
    },
    blood: {
      primary: { main: 'from-red-500 to-rose-700', glow: 'rgba(239,68,68,0.5)', text: 'text-red-100', border: 'border-red-400/50', accent: '#ef4444' },
      secondary: { main: 'from-rose-400 to-red-600', glow: 'rgba(251,113,133,0.5)', text: 'text-rose-100', border: 'border-rose-400/50', accent: '#fb7185' },
      accent: { main: 'from-pink-400 to-rose-600', glow: 'rgba(244,114,182,0.5)', text: 'text-pink-100', border: 'border-pink-400/50', accent: '#f472b6' },
    },
    neon: {
      primary: { main: 'from-pink-500 to-fuchsia-600', glow: 'rgba(236,72,153,0.6)', text: 'text-pink-100', border: 'border-pink-400/60', accent: '#ec4899' },
      secondary: { main: 'from-violet-400 to-purple-600', glow: 'rgba(167,139,250,0.6)', text: 'text-violet-100', border: 'border-violet-400/60', accent: '#a78bfa' },
      accent: { main: 'from-cyan-400 to-blue-600', glow: 'rgba(34,211,238,0.6)', text: 'text-cyan-100', border: 'border-cyan-400/60', accent: '#22d3ee' },
    },
    gold: {
      primary: { main: 'from-yellow-400 to-amber-600', glow: 'rgba(234,179,8,0.5)', text: 'text-yellow-100', border: 'border-yellow-400/50', accent: '#eab308' },
      secondary: { main: 'from-amber-400 to-orange-600', glow: 'rgba(245,158,11,0.5)', text: 'text-amber-100', border: 'border-amber-400/50', accent: '#f59e0b' },
      accent: { main: 'from-orange-400 to-yellow-600', glow: 'rgba(251,146,60,0.5)', text: 'text-orange-100', border: 'border-orange-400/50', accent: '#fb923c' },
    },
    amoled: {
      primary: { main: 'from-gray-500 to-zinc-700', glow: 'rgba(107,114,128,0.3)', text: 'text-gray-200', border: 'border-gray-500/40', accent: '#6b7280' },
      secondary: { main: 'from-zinc-500 to-gray-700', glow: 'rgba(113,113,122,0.3)', text: 'text-zinc-200', border: 'border-zinc-500/40', accent: '#71717a' },
      accent: { main: 'from-slate-500 to-gray-700', glow: 'rgba(100,116,139,0.3)', text: 'text-slate-200', border: 'border-slate-500/40', accent: '#64748b' },
    },
  };
  return themeColors[theme]?.[color] || themeColors.fire[color];
};

// Componente de haltere SVG personalizado
const DumbbellShape: React.FC<{ color: string; className?: string }> = memo(({ color, className }) => (
  <svg viewBox="0 0 120 40" className={className} fill="none">
    {/* Peso esquerdo */}
    <rect x="5" y="5" width="20" height="30" rx="3" fill={color} opacity="0.9" />
    <rect x="25" y="10" width="8" height="20" rx="2" fill={color} opacity="0.7" />
    {/* Barra central */}
    <rect x="33" y="17" width="54" height="6" rx="3" fill={color} opacity="0.6" />
    {/* Peso direito */}
    <rect x="87" y="10" width="8" height="20" rx="2" fill={color} opacity="0.7" />
    <rect x="95" y="5" width="20" height="30" rx="3" fill={color} opacity="0.9" />
  </svg>
));

DumbbellShape.displayName = 'DumbbellShape';

// Componente de kettlebell SVG
const KettlebellShape: React.FC<{ color: string; className?: string }> = memo(({ color, className }) => (
  <svg viewBox="0 0 40 50" className={className} fill="none">
    <path 
      d="M20 5 C10 5 8 12 8 12 L8 18 C8 18 2 25 2 35 C2 45 12 48 20 48 C28 48 38 45 38 35 C38 25 32 18 32 18 L32 12 C32 12 30 5 20 5 Z"
      fill={color} 
      opacity="0.9"
    />
    <ellipse cx="20" cy="10" rx="6" ry="3" fill="black" opacity="0.3" />
  </svg>
));

KettlebellShape.displayName = 'KettlebellShape';

// Componente de placa de peso SVG
const WeightPlateShape: React.FC<{ color: string; className?: string }> = memo(({ color, className }) => (
  <svg viewBox="0 0 50 50" className={className} fill="none">
    <circle cx="25" cy="25" r="23" fill={color} opacity="0.9" stroke={color} strokeWidth="2" />
    <circle cx="25" cy="25" r="18" fill="black" opacity="0.2" />
    <circle cx="25" cy="25" r="6" fill="black" opacity="0.4" />
  </svg>
));

WeightPlateShape.displayName = 'WeightPlateShape';

const ThemedHomeButton: React.FC<ThemedHomeButtonProps> = memo(({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const [ripples, setRipples] = useState<RippleType[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const rippleIdRef = useRef(0);
  
  const colors = useMemo(() => getThemeColors(currentTheme, color), [currentTheme, color]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple: RippleType = { id: rippleIdRef.current++, x, y };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 500);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createRipple(event);
      playClickSound();
      onClick();
    }
  }, [disabled, createRipple, playClickSound, onClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (hoverEffectsEnabled && !disabled) {
      playHoverSound();
    }
  }, [hoverEffectsEnabled, disabled, playHoverSound]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Determinar qual elemento fitness decorativo usar baseado na cor do botão
  const FitnessDecor = useMemo(() => {
    if (color === 'primary') return null; // Cliente - só ícone
    if (color === 'secondary') return 'dumbbell'; // Instrutor
    return 'crown'; // Admin
  }, [color]);

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverEffectsEnabled ? { scale: 1.05, y: -3 } : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'relative group flex flex-col items-center',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      {/* Container principal - Hexagonal fitness style */}
      <motion.div 
        className={cn(
          'relative flex items-center justify-center overflow-hidden',
          'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20',
          'rounded-2xl',
          `bg-gradient-to-br ${colors.main}`,
          `border-2 ${colors.border}`,
          'shadow-xl',
          'transition-all duration-200'
        )}
        style={{
          boxShadow: isHovered 
            ? `0 0 30px 8px ${colors.glow}, inset 0 1px 0 0 rgba(255,255,255,0.2)` 
            : `0 0 20px 4px ${colors.glow}, inset 0 1px 0 0 rgba(255,255,255,0.1)`,
        }}
        animate={{
          boxShadow: [
            `0 0 15px 2px ${colors.glow}`,
            `0 0 25px 6px ${colors.glow}`,
            `0 0 15px 2px ${colors.glow}`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Background pattern - fitness lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)`,
          }} />
        </div>

        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.span
              key={ripple.id}
              className="absolute rounded-full pointer-events-none z-5"
              style={{
                left: ripple.x,
                top: ripple.y,
                backgroundColor: 'rgba(255,255,255,0.4)',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{ width: 120, height: 120, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Inner shine effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20 pointer-events-none" />
        
        {/* Corner accent - fitness inspired */}
        <div className="absolute top-0 right-0 w-4 h-4 overflow-hidden">
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-white/20 rotate-45" />
        </div>

        {/* Fitness decoration elements */}
        {FitnessDecor === 'dumbbell' && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-30">
            <Dumbbell className="w-8 h-2 text-white" />
          </div>
        )}

        {FitnessDecor === 'crown' && (
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 opacity-40">
            <Crown className="w-4 h-3 text-white" />
          </div>
        )}
        
        {/* Main Icon with animation */}
        <motion.div
          animate={isHovered && hoverEffectsEnabled ? { 
            scale: 1.15, 
            rotate: [0, -5, 5, 0],
          } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <Icon 
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9',
              'text-white drop-shadow-lg'
            )} 
            strokeWidth={2.2} 
          />
        </motion.div>

        {/* Hover glow overlay */}
        {isHovered && hoverEffectsEnabled && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: `radial-gradient(circle at center, rgba(255,255,255,0.2), transparent 70%)`,
            }}
          />
        )}
      </motion.div>

      {/* Label with fitness style */}
      <motion.div 
        className="mt-2 flex flex-col items-center"
        animate={isHovered && hoverEffectsEnabled ? { y: -2 } : { y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span className={cn(
          'font-bebas text-xs sm:text-sm tracking-widest uppercase',
          'text-center leading-tight',
          colors.text,
          'transition-all duration-150'
        )}>
          {label}
        </span>
        
        {/* Decorative line under label */}
        <motion.div
          className="h-0.5 rounded-full mt-1"
          style={{ backgroundColor: colors.accent }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: isHovered ? '100%' : '30%', 
            opacity: isHovered ? 0.8 : 0.4 
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>

      {/* Floating fitness icons decoration on hover */}
      <AnimatePresence>
        {isHovered && hoverEffectsEnabled && (
          <>
            <motion.div
              className="absolute -left-2 top-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ opacity: 0, x: 10, scale: 0.5 }}
              animate={{ opacity: 0.5, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <Activity className="w-3 h-3" style={{ color: colors.accent }} />
            </motion.div>
            <motion.div
              className="absolute -right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ opacity: 0, x: -10, scale: 0.5 }}
              animate={{ opacity: 0.5, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.5 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <Target className="w-3 h-3" style={{ color: colors.accent }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

ThemedHomeButton.displayName = 'ThemedHomeButton';

export default ThemedHomeButton;
