import React, { memo, useMemo, useCallback, useState } from 'react';
import { LucideIcon, Dumbbell, User, Shield, Heart, Flame, Waves, TreePine, Zap, Sparkles, Trophy, Target, Activity } from 'lucide-react';
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

// Ícones fitness por tema e tipo de botão
const getFitnessIcon = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent'): LucideIcon => {
  const iconMap: Record<SportTheme, Record<string, LucideIcon>> = {
    fire: { primary: Flame, secondary: Activity, accent: Shield },
    ocean: { primary: Waves, secondary: Target, accent: Shield },
    forest: { primary: TreePine, secondary: Heart, accent: Shield },
    lightning: { primary: Zap, secondary: Target, accent: Shield },
    galaxy: { primary: Sparkles, secondary: Activity, accent: Shield },
    iron: { primary: Dumbbell, secondary: Target, accent: Shield },
    blood: { primary: Heart, secondary: Activity, accent: Shield },
    neon: { primary: Sparkles, secondary: Zap, accent: Shield },
    gold: { primary: Trophy, secondary: Target, accent: Shield },
    amoled: { primary: User, secondary: Dumbbell, accent: Shield },
  };
  return iconMap[theme]?.[color] || User;
};

// Cores do ripple por tema
const getRippleColor = (theme: SportTheme): string => {
  const colors: Record<SportTheme, string> = {
    fire: 'rgba(255, 107, 53, 0.5)',
    ocean: 'rgba(0, 212, 255, 0.5)',
    forest: 'rgba(16, 185, 129, 0.5)',
    lightning: 'rgba(251, 191, 36, 0.5)',
    galaxy: 'rgba(168, 85, 247, 0.5)',
    iron: 'rgba(148, 163, 184, 0.5)',
    blood: 'rgba(239, 68, 68, 0.5)',
    neon: 'rgba(244, 114, 182, 0.5)',
    gold: 'rgba(251, 191, 36, 0.5)',
    amoled: 'rgba(107, 114, 128, 0.5)',
  };
  return colors[theme] || colors.fire;
};

// Animação do ícone por tema
const getIconAnimation = (theme: SportTheme): { hover: { scale?: number | number[]; rotate?: number | number[]; y?: number | number[]; x?: number[]; opacity?: number[]; filter?: string }; transition: object } => {
  const animations: Record<SportTheme, { hover: { scale?: number | number[]; rotate?: number | number[]; y?: number | number[]; x?: number[]; opacity?: number[]; filter?: string }; transition: object }> = {
    fire: { 
      hover: { scale: 1.2, rotate: [0, -10, 10, 0], y: -2 },
      transition: { duration: 0.4 }
    },
    ocean: { 
      hover: { scale: 1.15, y: [-2, 2, -2], x: [0, 1, -1, 0] },
      transition: { duration: 0.6 }
    },
    forest: { 
      hover: { scale: 1.1, rotate: [0, 5, -5, 0] },
      transition: { duration: 0.5 }
    },
    lightning: { 
      hover: { scale: [1, 1.3, 1.1], opacity: [1, 0.8, 1] },
      transition: { duration: 0.2 }
    },
    galaxy: { 
      hover: { scale: 1.2, rotate: 180 },
      transition: { duration: 0.5 }
    },
    iron: { 
      hover: { scale: 1.1, y: -3 },
      transition: { duration: 0.2, type: 'spring', stiffness: 400 }
    },
    blood: { 
      hover: { scale: [1, 1.2, 1.1] },
      transition: { duration: 0.4 }
    },
    neon: { 
      hover: { scale: 1.15 },
      transition: { duration: 0.3 }
    },
    gold: { 
      hover: { scale: 1.15, rotate: [0, 10, -10, 0], y: -2 },
      transition: { duration: 0.4 }
    },
    amoled: { 
      hover: { scale: 1.08, opacity: [1, 0.9, 1] },
      transition: { duration: 0.2 }
    },
  };
  return animations[theme] || animations.fire;
};

// Estilos únicos por tema
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

  const styles: Record<SportTheme, ButtonStyle> = {
    fire: {
      shape: 'rounded-lg [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-orange-300/30',
      shadow: 'shadow-lg shadow-orange-500/30',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-orange-100 font-bold',
      hoverEffect: 'hover:shadow-orange-500/50 hover:scale-105',
      containerClass: 'w-16 h-16',
    },
    ocean: {
      shape: 'rounded-full',
      bg: `bg-gradient-to-t ${gradient}`,
      border: 'border border-cyan-200/40 ring-2 ring-cyan-400/20',
      shadow: 'shadow-md shadow-cyan-500/20',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-cyan-100 font-medium',
      hoverEffect: 'hover:ring-cyan-400/40 hover:scale-102',
      containerClass: 'w-14 h-14',
    },
    forest: {
      shape: 'rounded-2xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-emerald-200/30',
      shadow: 'shadow-lg shadow-emerald-500/25',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-emerald-100 font-medium',
      hoverEffect: 'hover:shadow-emerald-500/40 hover:scale-103',
      containerClass: 'w-15 h-15',
    },
    lightning: {
      shape: 'rounded-xl rotate-0',
      bg: `bg-gradient-to-r ${gradient}`,
      border: 'border-2 border-yellow-300/40',
      shadow: 'shadow-lg shadow-yellow-400/40',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-yellow-100 font-bold tracking-tight',
      hoverEffect: 'hover:shadow-yellow-400/60 hover:scale-108',
      containerClass: 'w-16 h-16 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]',
    },
    galaxy: {
      shape: 'rounded-full',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border border-purple-300/30 ring-4 ring-purple-500/10',
      shadow: 'shadow-xl shadow-purple-500/30',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-purple-100 font-medium tracking-wide',
      hoverEffect: 'hover:ring-purple-500/30 hover:scale-105',
      containerClass: 'w-16 h-16',
    },
    iron: {
      shape: 'rounded-md',
      bg: `bg-gradient-to-b ${gradient}`,
      border: 'border-2 border-slate-300/40',
      shadow: 'shadow-md shadow-slate-500/30',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-slate-200 font-bold uppercase tracking-widest',
      hoverEffect: 'hover:shadow-slate-500/50 hover:scale-102',
      containerClass: 'w-16 h-14',
    },
    blood: {
      shape: 'rounded-3xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border border-red-300/30',
      shadow: 'shadow-lg shadow-red-500/40',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-red-100 font-semibold',
      hoverEffect: 'hover:shadow-red-500/60 hover:scale-105',
      containerClass: 'w-15 h-16',
    },
    neon: {
      shape: 'rounded-xl',
      bg: `bg-gradient-to-r ${gradient}`,
      border: 'border-2 border-pink-400/50',
      shadow: 'shadow-lg shadow-pink-500/50',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-pink-100 font-bold',
      hoverEffect: 'hover:shadow-pink-500/70 hover:border-pink-300/70 hover:scale-105',
      containerClass: 'w-15 h-15',
    },
    gold: {
      shape: 'rounded-xl',
      bg: `bg-gradient-to-br ${gradient}`,
      border: 'border-2 border-yellow-300/50',
      shadow: 'shadow-lg shadow-amber-400/40',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-amber-100 font-semibold tracking-wide',
      hoverEffect: 'hover:shadow-amber-400/60 hover:scale-103',
      containerClass: 'w-16 h-16',
    },
    amoled: {
      shape: 'rounded-lg',
      bg: `bg-gradient-to-b ${gradient}`,
      border: 'border border-gray-500/30',
      shadow: 'shadow-md shadow-black/50',
      iconSize: 'w-7 h-7',
      labelStyle: 'text-gray-300 font-medium',
      hoverEffect: 'hover:shadow-black/70 hover:scale-102',
      containerClass: 'w-14 h-14',
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
  const [isHovered, setIsHovered] = useState(false);
  const rippleIdRef = React.useRef(0);
  
  const Icon = useMemo(() => getFitnessIcon(currentTheme, color), [currentTheme, color]);
  const style = useMemo(() => getButtonStyle(currentTheme, color), [currentTheme, color]);
  const rippleColor = useMemo(() => getRippleColor(currentTheme), [currentTheme]);
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
        'flex flex-col items-center justify-center gap-1.5',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      {/* Button container with theme-specific style */}
      <div className={cn(
        'relative flex items-center justify-center overflow-hidden',
        'transition-all duration-200',
        style.containerClass,
        style.shape,
        style.bg,
        style.border,
        style.shadow,
        hoverEffectsEnabled && style.hoverEffect
      )}>
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
              animate={{ width: 120, height: 120, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/15 pointer-events-none" 
             style={{ clipPath: 'inherit', borderRadius: 'inherit' }} />
        
        {/* Animated Icon */}
        <motion.div
          animate={isHovered && hoverEffectsEnabled ? iconAnimation.hover : { scale: 1, rotate: 0 }}
          transition={iconAnimation.transition}
          className="relative z-10"
        >
          <Icon className={cn(style.iconSize, 'text-white drop-shadow-sm')} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* Label */}
      <span className={cn(
        'font-bebas text-[9px] sm:text-[10px] tracking-wider',
        'uppercase text-center leading-tight',
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
