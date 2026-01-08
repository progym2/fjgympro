import React, { memo, useMemo, useState, useRef, useCallback } from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme, SportTheme, ThemeConfig } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  speed: number;
  size: number;
  color: string;
}

interface ThemedHomeButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

// Theme-specific button styles
const getButtonStyle = (theme: SportTheme, themeConfig: ThemeConfig) => {
  const styles: Record<SportTheme, {
    shape: string;
    containerClass: string;
    innerClass: string;
    iconContainerClass: string;
    accentClass: string;
  }> = {
    // Fire: Angular/sharp with flame-like edges
    fire: {
      shape: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      containerClass: 'bg-gradient-to-b from-orange-950/90 via-black/95 to-red-950/90 border-orange-500/30',
      innerClass: 'from-orange-500/20 via-transparent to-red-500/20',
      iconContainerClass: 'bg-gradient-to-br from-orange-500/30 to-red-600/20 border-orange-400/40',
      accentClass: 'bg-gradient-to-r from-orange-400 via-red-500 to-orange-400',
    },
    // Ocean: Smooth, wave-like curves
    ocean: {
      shape: 'ellipse(50% 50% at 50% 50%)',
      containerClass: 'bg-gradient-to-b from-cyan-950/90 via-black/95 to-blue-950/90 border-cyan-500/30 rounded-[2rem]',
      innerClass: 'from-cyan-500/20 via-transparent to-blue-500/20',
      iconContainerClass: 'bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border-cyan-400/40 rounded-full',
      accentClass: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400',
    },
    // Forest: Organic, leaf-like shape
    forest: {
      shape: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)',
      containerClass: 'bg-gradient-to-b from-emerald-950/90 via-black/95 to-green-950/90 border-emerald-500/30',
      innerClass: 'from-emerald-500/20 via-transparent to-green-500/20',
      iconContainerClass: 'bg-gradient-to-br from-emerald-500/30 to-green-600/20 border-emerald-400/40 rounded-2xl',
      accentClass: 'bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400',
    },
    // Lightning: Electric, zigzag edges
    lightning: {
      shape: 'polygon(50% 0%, 100% 10%, 90% 50%, 100% 90%, 50% 100%, 0% 90%, 10% 50%, 0% 10%)',
      containerClass: 'bg-gradient-to-b from-yellow-950/90 via-black/95 to-amber-950/90 border-yellow-500/30',
      innerClass: 'from-yellow-500/20 via-transparent to-amber-500/20',
      iconContainerClass: 'bg-gradient-to-br from-yellow-500/30 to-amber-600/20 border-yellow-400/40',
      accentClass: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400',
    },
    // Galaxy: Star-like, cosmic
    galaxy: {
      shape: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      containerClass: 'bg-gradient-to-b from-purple-950/90 via-black/95 to-violet-950/90 border-purple-500/30',
      innerClass: 'from-purple-500/20 via-transparent to-violet-500/20',
      iconContainerClass: 'bg-gradient-to-br from-purple-500/30 to-violet-600/20 border-purple-400/40 rounded-xl',
      accentClass: 'bg-gradient-to-r from-purple-400 via-violet-500 to-purple-400',
    },
    // Iron: Industrial, mechanical
    iron: {
      shape: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)',
      containerClass: 'bg-gradient-to-b from-slate-900/95 via-black/95 to-zinc-900/95 border-slate-500/30',
      innerClass: 'from-slate-500/20 via-transparent to-zinc-500/20',
      iconContainerClass: 'bg-gradient-to-br from-slate-500/30 to-zinc-600/20 border-slate-400/40',
      accentClass: 'bg-gradient-to-r from-slate-400 via-zinc-500 to-slate-400',
    },
    // Blood: Heart/drop shape
    blood: {
      shape: 'polygon(50% 0%, 100% 35%, 80% 100%, 50% 85%, 20% 100%, 0% 35%)',
      containerClass: 'bg-gradient-to-b from-red-950/90 via-black/95 to-rose-950/90 border-red-500/30',
      innerClass: 'from-red-500/20 via-transparent to-rose-500/20',
      iconContainerClass: 'bg-gradient-to-br from-red-500/30 to-rose-600/20 border-red-400/40 rounded-xl',
      accentClass: 'bg-gradient-to-r from-red-400 via-rose-500 to-red-400',
    },
    // Neon: Glowing, rounded with strong glow
    neon: {
      shape: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)',
      containerClass: 'bg-gradient-to-b from-pink-950/90 via-black/95 to-fuchsia-950/90 border-pink-500/50',
      innerClass: 'from-pink-500/30 via-transparent to-fuchsia-500/30',
      iconContainerClass: 'bg-gradient-to-br from-pink-500/40 to-fuchsia-600/30 border-pink-400/50 rounded-xl',
      accentClass: 'bg-gradient-to-r from-pink-400 via-fuchsia-500 to-pink-400',
    },
    // Gold: Crown/trophy shape
    gold: {
      shape: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%)',
      containerClass: 'bg-gradient-to-b from-yellow-950/90 via-black/95 to-amber-950/90 border-yellow-500/40',
      innerClass: 'from-yellow-500/20 via-transparent to-amber-500/20',
      iconContainerClass: 'bg-gradient-to-br from-yellow-500/30 to-amber-600/20 border-yellow-400/40 rounded-lg',
      accentClass: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400',
    },
    // AMOLED: Minimal, pure black with subtle edges
    amoled: {
      shape: 'inset(0 round 0.5rem)',
      containerClass: 'bg-black border-gray-700/30',
      innerClass: 'from-gray-800/20 via-transparent to-gray-900/20',
      iconContainerClass: 'bg-gradient-to-br from-gray-700/30 to-gray-800/20 border-gray-600/30',
      accentClass: 'bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500',
    },
  };

  return styles[theme];
};

// Color variants per button type
const getColorVariant = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent') => {
  const colorMap: Record<SportTheme, Record<string, { icon: string; glow: string; border: string }>> = {
    fire: {
      primary: { icon: 'text-orange-400', glow: 'shadow-orange-500/50', border: 'border-orange-500/40' },
      secondary: { icon: 'text-emerald-400', glow: 'shadow-emerald-500/50', border: 'border-emerald-500/40' },
      accent: { icon: 'text-cyan-400', glow: 'shadow-cyan-500/50', border: 'border-cyan-500/40' },
    },
    ocean: {
      primary: { icon: 'text-cyan-400', glow: 'shadow-cyan-500/50', border: 'border-cyan-500/40' },
      secondary: { icon: 'text-teal-400', glow: 'shadow-teal-500/50', border: 'border-teal-500/40' },
      accent: { icon: 'text-indigo-400', glow: 'shadow-indigo-500/50', border: 'border-indigo-500/40' },
    },
    forest: {
      primary: { icon: 'text-emerald-400', glow: 'shadow-emerald-500/50', border: 'border-emerald-500/40' },
      secondary: { icon: 'text-lime-400', glow: 'shadow-lime-500/50', border: 'border-lime-500/40' },
      accent: { icon: 'text-teal-400', glow: 'shadow-teal-500/50', border: 'border-teal-500/40' },
    },
    lightning: {
      primary: { icon: 'text-yellow-400', glow: 'shadow-yellow-500/50', border: 'border-yellow-500/40' },
      secondary: { icon: 'text-orange-400', glow: 'shadow-orange-500/50', border: 'border-orange-500/40' },
      accent: { icon: 'text-amber-400', glow: 'shadow-amber-500/50', border: 'border-amber-500/40' },
    },
    galaxy: {
      primary: { icon: 'text-purple-400', glow: 'shadow-purple-500/50', border: 'border-purple-500/40' },
      secondary: { icon: 'text-pink-400', glow: 'shadow-pink-500/50', border: 'border-pink-500/40' },
      accent: { icon: 'text-indigo-400', glow: 'shadow-indigo-500/50', border: 'border-indigo-500/40' },
    },
    iron: {
      primary: { icon: 'text-slate-300', glow: 'shadow-slate-500/40', border: 'border-slate-500/40' },
      secondary: { icon: 'text-zinc-300', glow: 'shadow-zinc-500/40', border: 'border-zinc-500/40' },
      accent: { icon: 'text-gray-300', glow: 'shadow-gray-500/40', border: 'border-gray-500/40' },
    },
    blood: {
      primary: { icon: 'text-red-400', glow: 'shadow-red-500/50', border: 'border-red-500/40' },
      secondary: { icon: 'text-rose-400', glow: 'shadow-rose-500/50', border: 'border-rose-500/40' },
      accent: { icon: 'text-pink-400', glow: 'shadow-pink-500/50', border: 'border-pink-500/40' },
    },
    neon: {
      primary: { icon: 'text-pink-400', glow: 'shadow-pink-500/60', border: 'border-pink-500/50' },
      secondary: { icon: 'text-violet-400', glow: 'shadow-violet-500/60', border: 'border-violet-500/50' },
      accent: { icon: 'text-cyan-400', glow: 'shadow-cyan-500/60', border: 'border-cyan-500/50' },
    },
    gold: {
      primary: { icon: 'text-yellow-400', glow: 'shadow-yellow-500/50', border: 'border-yellow-500/40' },
      secondary: { icon: 'text-amber-400', glow: 'shadow-amber-500/50', border: 'border-amber-500/40' },
      accent: { icon: 'text-orange-400', glow: 'shadow-orange-500/50', border: 'border-orange-500/40' },
    },
    amoled: {
      primary: { icon: 'text-gray-300', glow: 'shadow-gray-600/30', border: 'border-gray-600/30' },
      secondary: { icon: 'text-gray-400', glow: 'shadow-gray-600/30', border: 'border-gray-600/30' },
      accent: { icon: 'text-gray-500', glow: 'shadow-gray-600/30', border: 'border-gray-600/30' },
    },
  };
  
  return colorMap[theme][color];
};

// Cores das partículas por tema
const getParticleColors = (theme: SportTheme): string[] => {
  const colorMap: Record<SportTheme, string[]> = {
    fire: ['#FF6B35', '#FF9F1C', '#FFCC00', '#FF4500'],
    ocean: ['#00D4FF', '#0099CC', '#66E0FF', '#00BFFF'],
    forest: ['#10B981', '#34D399', '#6EE7B7', '#059669'],
    lightning: ['#FBBF24', '#FCD34D', '#FDE68A', '#F59E0B'],
    galaxy: ['#A855F7', '#C084FC', '#E879F9', '#8B5CF6'],
    iron: ['#94A3B8', '#CBD5E1', '#E2E8F0', '#64748B'],
    blood: ['#EF4444', '#F87171', '#FCA5A5', '#DC2626'],
    neon: ['#F472B6', '#E879F9', '#A78BFA', '#67E8F9'],
    gold: ['#FBBF24', '#F59E0B', '#D97706', '#FCD34D'],
    amoled: ['#6B7280', '#9CA3AF', '#D1D5DB', '#4B5563'],
  };
  return colorMap[theme] || colorMap.fire;
};

const ThemedHomeButton: React.FC<ThemedHomeButtonProps> = memo(({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, themeConfig, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const [ripples, setRipples] = useState<RippleType[]>([]);
  const [particles, setParticles] = useState<ParticleType[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const particleIdRef = useRef(0);
  
  const style = useMemo(() => getButtonStyle(currentTheme, themeConfig), [currentTheme, themeConfig]);
  const colorVariant = useMemo(() => getColorVariant(currentTheme, color), [currentTheme, color]);
  const particleColors = useMemo(() => getParticleColors(currentTheme), [currentTheme]);
  
  // Get theme icon based on button type
  const ThemeIcon = useMemo(() => {
    if (color === 'primary') return themeConfig.icons.main;
    if (color === 'secondary') return themeConfig.icons.secondary;
    return themeConfig.icons.accent;
  }, [themeConfig, color]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple: RippleType = {
      id: Date.now(),
      x,
      y,
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  }, []);

  // Criar partículas que emanam do clique
  const createParticles = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newParticles: ParticleType[] = [];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 360 + Math.random() * 20 - 10;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        angle,
        speed: 40 + Math.random() * 30,
        size: 3 + Math.random() * 3,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 500);
  }, [particleColors]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createRipple(event);
      createParticles(event);
      playClickSound();
      onClick();
    }
  }, [disabled, createRipple, createParticles, playClickSound, onClick]);

  const handleHover = () => {
    if (hoverEffectsEnabled && !disabled) {
      playHoverSound();
    }
  };

  // Use circular shape for ocean theme
  const isCircular = currentTheme === 'ocean';
  const isStarShape = currentTheme === 'galaxy';

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverEffectsEnabled ? { 
        scale: 1.08, 
        y: -5,
        transition: { duration: 0.2 }
      } : undefined}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative group overflow-hidden',
        'flex flex-col items-center justify-center',
        isCircular ? 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full' :
        isStarShape ? 'w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44' :
        'w-32 h-36 sm:w-36 sm:h-40 md:w-40 md:h-44',
        'transition-all duration-300 ease-out',
        'border',
        style.containerClass,
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
      style={{
        clipPath: isCircular ? undefined : style.shape,
      }}
    >
      {/* Particle effects */}
      <AnimatePresence>
        {particles.map(particle => {
          const radians = (particle.angle * Math.PI) / 180;
          const endX = Math.cos(radians) * particle.speed;
          const endY = Math.sin(radians) * particle.speed;
          
          return (
            <motion.span
              key={particle.id}
              className="absolute rounded-full pointer-events-none z-50"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              }}
              initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
              animate={{ 
                scale: 0, 
                opacity: 0,
                x: endX,
                y: endY,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          );
        })}
      </AnimatePresence>
      
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className={cn(
              'absolute rounded-full pointer-events-none',
              colorVariant.icon.replace('text-', 'bg-'),
              'opacity-30'
            )}
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
            animate={{ 
              width: 200, 
              height: 200, 
              x: -100, 
              y: -100, 
              opacity: 0 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
      {/* Inner gradient overlay */}
      <div 
        className={cn(
          'absolute inset-[2px]',
          'bg-gradient-to-b',
          style.innerClass,
          'pointer-events-none'
        )}
        style={{
          clipPath: isCircular ? undefined : style.shape,
        }}
      />

      {/* Animated accent line */}
      <motion.div 
        className={cn(
          'absolute top-3 left-1/2 -translate-x-1/2',
          'h-0.5 rounded-full',
          style.accentClass,
          'opacity-60'
        )}
        initial={{ width: '2rem' }}
        whileHover={{ width: '3rem', opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Icon container with theme-specific icon */}
      <div className={cn(
        'relative z-10',
        isCircular ? 'mt-0' : 'mt-2',
        'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
        'flex items-center justify-center',
        'border',
        style.iconContainerClass,
        colorVariant.border,
        'transition-all duration-300',
        hoverEffectsEnabled && `group-hover:shadow-lg ${colorVariant.glow}`
      )}>
        {/* Main button icon */}
        <Icon
          className={cn(
            'w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12',
            colorVariant.icon,
            'transition-all duration-300',
            hoverEffectsEnabled && 'group-hover:scale-110'
          )}
          strokeWidth={themeConfig.icons.style === 'filled' ? 2.5 : 1.5}
        />
        
        {/* Small theme icon indicator */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 flex items-center justify-center">
          <ThemeIcon 
            className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', colorVariant.icon, 'opacity-70')} 
            strokeWidth={2}
          />
        </div>
      </div>

      {/* Label */}
      <span className={cn(
        'relative z-10',
        isCircular ? 'mt-1' : 'mt-2',
        'font-bebas text-base sm:text-lg md:text-xl tracking-widest',
        'text-white/80 group-hover:text-white',
        'uppercase text-center',
        'transition-colors duration-300'
      )}>
        {label}
      </span>

      {/* Bottom accent dots */}
      {!isCircular && (
        <div className="absolute bottom-3 flex gap-1">
          <div className={cn('w-1 h-1 rounded-full', colorVariant.icon, 'opacity-40 group-hover:opacity-80 transition-opacity')} />
          <div className={cn('w-1.5 h-1.5 rounded-full', colorVariant.icon, 'opacity-60 group-hover:opacity-100 transition-opacity')} />
          <div className={cn('w-1 h-1 rounded-full', colorVariant.icon, 'opacity-40 group-hover:opacity-80 transition-opacity')} />
        </div>
      )}

      {/* Outer glow on hover */}
      <div className={cn(
        'absolute -inset-3 -z-10',
        'rounded-3xl blur-xl',
        'bg-gradient-to-br',
        style.innerClass,
        'opacity-0 group-hover:opacity-40',
        'transition-opacity duration-500',
        colorVariant.glow
      )} />
    </motion.button>
  );
});

ThemedHomeButton.displayName = 'ThemedHomeButton';

export default ThemedHomeButton;
