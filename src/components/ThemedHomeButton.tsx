import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import { LucideIcon, Dumbbell, User, Shield, Heart, Flame, Waves, TreePine, Zap, Sparkles, Trophy, Target, Activity, Bike, Mountain, Sword, Crown, Rocket, Star, Timer, Gauge, Footprints, PersonStanding } from 'lucide-react';
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

interface ParticleType {
  id: number;
  x: number;
  y: number;
  angle: number;
  velocity: number;
  size: number;
  color: string;
}

// Ícones esportivos modernos por tema e tipo de botão
const getFitnessIcon = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent'): LucideIcon => {
  const iconMap: Record<SportTheme, Record<string, LucideIcon>> = {
    fire: { primary: PersonStanding, secondary: Timer, accent: Crown },
    ocean: { primary: PersonStanding, secondary: Gauge, accent: Crown },
    forest: { primary: PersonStanding, secondary: Footprints, accent: Crown },
    lightning: { primary: PersonStanding, secondary: Rocket, accent: Crown },
    galaxy: { primary: PersonStanding, secondary: Star, accent: Crown },
    iron: { primary: PersonStanding, secondary: Dumbbell, accent: Crown },
    blood: { primary: PersonStanding, secondary: Heart, accent: Crown },
    neon: { primary: PersonStanding, secondary: Sparkles, accent: Crown },
    gold: { primary: PersonStanding, secondary: Trophy, accent: Crown },
    amoled: { primary: PersonStanding, secondary: Target, accent: Crown },
  };
  return iconMap[theme]?.[color] || User;
};

// Cores do ripple por tema
const getRippleColor = (theme: SportTheme): string => {
  const colors: Record<SportTheme, string> = {
    fire: 'rgba(255, 107, 53, 0.6)',
    ocean: 'rgba(0, 212, 255, 0.6)',
    forest: 'rgba(16, 185, 129, 0.6)',
    lightning: 'rgba(251, 191, 36, 0.6)',
    galaxy: 'rgba(168, 85, 247, 0.6)',
    iron: 'rgba(148, 163, 184, 0.6)',
    blood: 'rgba(239, 68, 68, 0.6)',
    neon: 'rgba(244, 114, 182, 0.6)',
    gold: 'rgba(251, 191, 36, 0.6)',
    amoled: 'rgba(107, 114, 128, 0.6)',
  };
  return colors[theme] || colors.fire;
};

// Cores das partículas por tema
const getParticleColors = (theme: SportTheme): string[] => {
  const colors: Record<SportTheme, string[]> = {
    fire: ['#ff6b35', '#ff8c42', '#ffd700', '#ff4500', '#ff7f50'],
    ocean: ['#00d4ff', '#00bcd4', '#4dd0e1', '#0097a7', '#26c6da'],
    forest: ['#10b981', '#22c55e', '#4ade80', '#16a34a', '#86efac'],
    lightning: ['#fbbf24', '#f59e0b', '#fcd34d', '#d97706', '#fef08a'],
    galaxy: ['#a855f7', '#c084fc', '#e879f9', '#9333ea', '#d946ef'],
    iron: ['#94a3b8', '#cbd5e1', '#64748b', '#e2e8f0', '#475569'],
    blood: ['#ef4444', '#f87171', '#dc2626', '#fca5a5', '#b91c1c'],
    neon: ['#f472b6', '#ec4899', '#db2777', '#f9a8d4', '#be185d'],
    gold: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#b45309'],
    amoled: ['#6b7280', '#9ca3af', '#4b5563', '#d1d5db', '#374151'],
  };
  return colors[theme] || colors.fire;
};

// Cores do glow pulsante por tema
const getGlowColor = (theme: SportTheme): { dim: string; bright: string } => {
  const colors: Record<SportTheme, { dim: string; bright: string }> = {
    fire: { dim: '0 0 20px 2px rgba(255, 107, 53, 0.25)', bright: '0 0 40px 10px rgba(255, 107, 53, 0.5)' },
    ocean: { dim: '0 0 20px 2px rgba(0, 212, 255, 0.25)', bright: '0 0 40px 10px rgba(0, 212, 255, 0.5)' },
    forest: { dim: '0 0 20px 2px rgba(16, 185, 129, 0.25)', bright: '0 0 40px 10px rgba(16, 185, 129, 0.5)' },
    lightning: { dim: '0 0 20px 2px rgba(251, 191, 36, 0.3)', bright: '0 0 45px 12px rgba(251, 191, 36, 0.6)' },
    galaxy: { dim: '0 0 20px 2px rgba(168, 85, 247, 0.25)', bright: '0 0 40px 10px rgba(168, 85, 247, 0.5)' },
    iron: { dim: '0 0 15px 2px rgba(148, 163, 184, 0.2)', bright: '0 0 30px 8px rgba(148, 163, 184, 0.4)' },
    blood: { dim: '0 0 20px 2px rgba(239, 68, 68, 0.3)', bright: '0 0 40px 10px rgba(239, 68, 68, 0.55)' },
    neon: { dim: '0 0 25px 3px rgba(244, 114, 182, 0.35)', bright: '0 0 50px 14px rgba(244, 114, 182, 0.65)' },
    gold: { dim: '0 0 20px 2px rgba(251, 191, 36, 0.3)', bright: '0 0 40px 10px rgba(251, 191, 36, 0.55)' },
    amoled: { dim: '0 0 12px 2px rgba(107, 114, 128, 0.15)', bright: '0 0 25px 6px rgba(107, 114, 128, 0.35)' },
  };
  return colors[theme] || colors.fire;
};

// Animação do ícone por tema
const getIconAnimation = (theme: SportTheme): { hover: { scale?: number | number[]; rotate?: number | number[]; y?: number | number[]; x?: number[]; opacity?: number[]; filter?: string }; transition: object } => {
  const animations: Record<SportTheme, { hover: { scale?: number | number[]; rotate?: number | number[]; y?: number | number[]; x?: number[]; opacity?: number[]; filter?: string }; transition: object }> = {
    fire: { 
      hover: { scale: 1.25, rotate: [0, -8, 8, 0], y: -3 },
      transition: { duration: 0.4 }
    },
    ocean: { 
      hover: { scale: 1.2, y: [-3, 3, -3], x: [0, 2, -2, 0] },
      transition: { duration: 0.6 }
    },
    forest: { 
      hover: { scale: 1.15, rotate: [0, 5, -5, 0] },
      transition: { duration: 0.5 }
    },
    lightning: { 
      hover: { scale: [1, 1.35, 1.2], opacity: [1, 0.8, 1] },
      transition: { duration: 0.2 }
    },
    galaxy: { 
      hover: { scale: 1.25, rotate: 360 },
      transition: { duration: 0.6 }
    },
    iron: { 
      hover: { scale: 1.15, y: -4 },
      transition: { duration: 0.2, type: 'spring', stiffness: 400 }
    },
    blood: { 
      hover: { scale: [1, 1.25, 1.15] },
      transition: { duration: 0.4 }
    },
    neon: { 
      hover: { scale: 1.2 },
      transition: { duration: 0.3 }
    },
    gold: { 
      hover: { scale: 1.2, rotate: [0, 12, -12, 0], y: -3 },
      transition: { duration: 0.4 }
    },
    amoled: { 
      hover: { scale: 1.1, opacity: [1, 0.85, 1] },
      transition: { duration: 0.2 }
    },
  };
  return animations[theme] || animations.fire;
};

// Estilos únicos por tema - TAMANHOS RESPONSIVOS PARA DESKTOP E MOBILE
type ButtonStyle = {
  shape: string;
  bg: string;
  border: string;
  shadow: string;
  iconSize: string;
  labelStyle: string;
  hoverEffect: string;
  containerClass: string;
};

const getButtonStyle = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent'): ButtonStyle => {
  const colorGradients = {
    primary: {
      fire: 'from-orange-500 via-red-500 to-orange-600',
      ocean: 'from-cyan-400 via-blue-500 to-cyan-600',
      forest: 'from-emerald-400 via-green-500 to-emerald-600',
      lightning: 'from-yellow-400 via-amber-500 to-yellow-600',
      galaxy: 'from-purple-400 via-violet-500 to-purple-600',
      iron: 'from-slate-400 via-zinc-500 to-slate-600',
      blood: 'from-red-400 via-rose-500 to-red-600',
      neon: 'from-pink-400 via-fuchsia-500 to-pink-600',
      gold: 'from-yellow-400 via-amber-500 to-yellow-600',
      amoled: 'from-gray-500 via-zinc-600 to-gray-700',
    },
    secondary: {
      fire: 'from-emerald-400 via-teal-500 to-emerald-600',
      ocean: 'from-teal-400 via-cyan-500 to-teal-600',
      forest: 'from-lime-400 via-green-500 to-lime-600',
      lightning: 'from-orange-400 via-amber-500 to-orange-600',
      galaxy: 'from-pink-400 via-purple-500 to-pink-600',
      iron: 'from-zinc-400 via-slate-500 to-zinc-600',
      blood: 'from-rose-400 via-red-500 to-rose-600',
      neon: 'from-violet-400 via-purple-500 to-violet-600',
      gold: 'from-amber-400 via-orange-500 to-amber-600',
      amoled: 'from-zinc-500 via-gray-600 to-zinc-700',
    },
    accent: {
      fire: 'from-blue-400 via-indigo-500 to-blue-600',
      ocean: 'from-indigo-400 via-purple-500 to-indigo-600',
      forest: 'from-teal-400 via-emerald-500 to-teal-600',
      lightning: 'from-red-400 via-orange-500 to-red-600',
      galaxy: 'from-indigo-400 via-blue-500 to-indigo-600',
      iron: 'from-gray-400 via-zinc-500 to-gray-600',
      blood: 'from-pink-400 via-rose-500 to-pink-600',
      neon: 'from-cyan-400 via-blue-500 to-cyan-600',
      gold: 'from-orange-400 via-yellow-500 to-orange-600',
      amoled: 'from-slate-500 via-gray-600 to-slate-700',
    },
  };

  const gradient = colorGradients[color][theme] || colorGradients[color].fire;

  // Tamanho responsivo otimizado para mobile e desktop
  const baseContainerClass = 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40';
  const baseIconSize = 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18';

  const styles: Record<SportTheme, ButtonStyle> = {
    fire: {
      shape: 'rounded-2xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-orange-300/40',
      shadow: 'shadow-2xl shadow-orange-500/40',
      iconSize: baseIconSize,
      labelStyle: 'text-orange-100 font-bold',
      hoverEffect: 'hover:shadow-orange-500/60 hover:scale-105',
      containerClass: baseContainerClass,
    },
    ocean: {
      shape: 'rounded-full',
      bg: `bg-gradient-to-t ${gradient}`,
      border: 'border-2 border-cyan-200/50 ring-2 ring-cyan-400/25',
      shadow: 'shadow-xl shadow-cyan-500/30',
      iconSize: baseIconSize,
      labelStyle: 'text-cyan-100 font-semibold',
      hoverEffect: 'hover:ring-cyan-400/50 hover:scale-103',
      containerClass: baseContainerClass,
    },
    forest: {
      shape: 'rounded-3xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-emerald-200/40',
      shadow: 'shadow-xl shadow-emerald-500/35',
      iconSize: baseIconSize,
      labelStyle: 'text-emerald-100 font-semibold',
      hoverEffect: 'hover:shadow-emerald-500/50 hover:scale-104',
      containerClass: baseContainerClass,
    },
    lightning: {
      shape: 'rounded-xl',
      bg: `bg-gradient-to-r ${gradient}`,
      border: 'border-2 border-yellow-300/50',
      shadow: 'shadow-2xl shadow-yellow-400/50',
      iconSize: baseIconSize,
      labelStyle: 'text-yellow-100 font-bold tracking-tight',
      hoverEffect: 'hover:shadow-yellow-400/70 hover:scale-110',
      containerClass: baseContainerClass,
    },
    galaxy: {
      shape: 'rounded-full',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-purple-300/40 ring-4 ring-purple-500/15',
      shadow: 'shadow-2xl shadow-purple-500/40',
      iconSize: baseIconSize,
      labelStyle: 'text-purple-100 font-semibold tracking-wide',
      hoverEffect: 'hover:ring-purple-500/40 hover:scale-105',
      containerClass: baseContainerClass,
    },
    iron: {
      shape: 'rounded-lg',
      bg: `bg-gradient-to-b ${gradient}`,
      border: 'border-2 border-slate-300/50',
      shadow: 'shadow-xl shadow-slate-500/40',
      iconSize: baseIconSize,
      labelStyle: 'text-slate-200 font-bold uppercase tracking-widest',
      hoverEffect: 'hover:shadow-slate-500/60 hover:scale-103',
      containerClass: baseContainerClass,
    },
    blood: {
      shape: 'rounded-3xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-red-300/40',
      shadow: 'shadow-2xl shadow-red-500/50',
      iconSize: baseIconSize,
      labelStyle: 'text-red-100 font-bold',
      hoverEffect: 'hover:shadow-red-500/70 hover:scale-105',
      containerClass: baseContainerClass,
    },
    neon: {
      shape: 'rounded-2xl',
      bg: `bg-gradient-to-r ${gradient}`,
      border: 'border-2 border-pink-400/60',
      shadow: 'shadow-2xl shadow-pink-500/60',
      iconSize: baseIconSize,
      labelStyle: 'text-pink-100 font-bold',
      hoverEffect: 'hover:shadow-pink-500/80 hover:border-pink-300/80 hover:scale-105',
      containerClass: baseContainerClass,
    },
    gold: {
      shape: 'rounded-2xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-yellow-300/60',
      shadow: 'shadow-2xl shadow-amber-400/50',
      iconSize: baseIconSize,
      labelStyle: 'text-amber-100 font-bold tracking-wide',
      hoverEffect: 'hover:shadow-amber-400/70 hover:scale-104',
      containerClass: baseContainerClass,
    },
    amoled: {
      shape: 'rounded-xl',
      bg: `bg-gradient-to-b ${gradient}`,
      border: 'border border-gray-500/40',
      shadow: 'shadow-xl shadow-black/60',
      iconSize: baseIconSize,
      labelStyle: 'text-gray-300 font-medium',
      hoverEffect: 'hover:shadow-black/80 hover:scale-102',
      containerClass: baseContainerClass,
    },
  };

  return styles[theme] || styles.fire;
};

const ThemedHomeButton: React.FC<ThemedHomeButtonProps> = memo(({
  onClick,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const [ripples, setRipples] = useState<RippleType[]>([]);
  const [particles, setParticles] = useState<ParticleType[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const rippleIdRef = useRef(0);
  const particleIdRef = useRef(0);
  
  const Icon = useMemo(() => getFitnessIcon(currentTheme, color), [currentTheme, color]);
  const style = useMemo(() => getButtonStyle(currentTheme, color), [currentTheme, color]);
  const rippleColor = useMemo(() => getRippleColor(currentTheme), [currentTheme]);
  const particleColors = useMemo(() => getParticleColors(currentTheme), [currentTheme]);
  const glowColors = useMemo(() => getGlowColor(currentTheme), [currentTheme]);
  const iconAnimation = useMemo(() => getIconAnimation(currentTheme), [currentTheme]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple: RippleType = {
      id: rippleIdRef.current++,
      x,
      y,
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  }, []);

  const createParticles = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newParticles: ParticleType[] = [];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 360 + Math.random() * 30;
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        angle,
        velocity: 80 + Math.random() * 60,
        size: 4 + Math.random() * 6,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 800);
  }, [particleColors]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createRipple(event);
      createParticles(event);
      playClickSound();
      onClick();
    }
  }, [disabled, createRipple, createParticles, playClickSound, onClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (hoverEffectsEnabled && !disabled) {
      playHoverSound();
    }
  }, [hoverEffectsEnabled, disabled, playHoverSound]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverEffectsEnabled ? { scale: 1.08 } : undefined}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'relative group',
        'flex flex-col items-center justify-center gap-2',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      {/* Particle effects container */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute pointer-events-none z-20 rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              left: particle.x,
              top: particle.y,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
            initial={{ 
              scale: 1, 
              opacity: 1,
              x: 0,
              y: 0,
            }}
            animate={{ 
              scale: 0,
              opacity: 0,
              x: Math.cos(particle.angle * Math.PI / 180) * particle.velocity,
              y: Math.sin(particle.angle * Math.PI / 180) * particle.velocity,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        ))}
      </AnimatePresence>

      {/* Button container with theme-specific style */}
      <motion.div 
        className={cn(
          'relative flex items-center justify-center overflow-hidden',
          'transition-all duration-200',
          style.containerClass,
          style.shape,
          style.bg,
          style.border,
          style.shadow,
          hoverEffectsEnabled && style.hoverEffect
        )}
        animate={{
          boxShadow: [
            glowColors.dim,
            glowColors.bright,
            glowColors.dim,
          ],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.span
              key={ripple.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                backgroundColor: rippleColor,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{ width: 180, height: 180, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20 pointer-events-none" 
             style={{ clipPath: 'inherit', borderRadius: 'inherit' }} />
        
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-[inherit] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        {/* Animated Icon */}
        <motion.div
          animate={isHovered && hoverEffectsEnabled ? iconAnimation.hover : { scale: 1, rotate: 0 }}
          transition={iconAnimation.transition}
          className="relative z-10"
        >
          <Icon className={cn(style.iconSize, 'text-white drop-shadow-lg')} strokeWidth={2} />
        </motion.div>
      </motion.div>

      {/* Label */}
      <span className={cn(
        'font-bebas text-base sm:text-lg md:text-xl lg:text-2xl xl:text-2xl tracking-wider',
        'uppercase text-center leading-tight mt-2 sm:mt-3',
        'transition-opacity duration-150',
        style.labelStyle
      )}>
        {label}
      </span>
    </motion.button>
  );
});

ThemedHomeButton.displayName = 'ThemedHomeButton';

export default ThemedHomeButton;