import React, { memo, useMemo, useState, useRef, useCallback } from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

// Color variants per button type
const getColorVariant = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent') => {
  const colorMap: Record<SportTheme, Record<string, { bg: string; border: string; glow: string; text: string }>> = {
    fire: {
      primary: { bg: 'from-orange-500 to-red-600', border: 'border-orange-400/50', glow: 'shadow-orange-500/40', text: 'text-orange-100' },
      secondary: { bg: 'from-emerald-500 to-green-600', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/40', text: 'text-emerald-100' },
      accent: { bg: 'from-cyan-500 to-blue-600', border: 'border-cyan-400/50', glow: 'shadow-cyan-500/40', text: 'text-cyan-100' },
    },
    ocean: {
      primary: { bg: 'from-cyan-500 to-blue-600', border: 'border-cyan-400/50', glow: 'shadow-cyan-500/40', text: 'text-cyan-100' },
      secondary: { bg: 'from-teal-500 to-emerald-600', border: 'border-teal-400/50', glow: 'shadow-teal-500/40', text: 'text-teal-100' },
      accent: { bg: 'from-indigo-500 to-violet-600', border: 'border-indigo-400/50', glow: 'shadow-indigo-500/40', text: 'text-indigo-100' },
    },
    forest: {
      primary: { bg: 'from-emerald-500 to-green-600', border: 'border-emerald-400/50', glow: 'shadow-emerald-500/40', text: 'text-emerald-100' },
      secondary: { bg: 'from-lime-500 to-green-600', border: 'border-lime-400/50', glow: 'shadow-lime-500/40', text: 'text-lime-100' },
      accent: { bg: 'from-teal-500 to-cyan-600', border: 'border-teal-400/50', glow: 'shadow-teal-500/40', text: 'text-teal-100' },
    },
    lightning: {
      primary: { bg: 'from-yellow-400 to-amber-500', border: 'border-yellow-400/50', glow: 'shadow-yellow-500/40', text: 'text-yellow-100' },
      secondary: { bg: 'from-orange-500 to-red-500', border: 'border-orange-400/50', glow: 'shadow-orange-500/40', text: 'text-orange-100' },
      accent: { bg: 'from-amber-500 to-orange-600', border: 'border-amber-400/50', glow: 'shadow-amber-500/40', text: 'text-amber-100' },
    },
    galaxy: {
      primary: { bg: 'from-purple-500 to-violet-600', border: 'border-purple-400/50', glow: 'shadow-purple-500/40', text: 'text-purple-100' },
      secondary: { bg: 'from-pink-500 to-rose-600', border: 'border-pink-400/50', glow: 'shadow-pink-500/40', text: 'text-pink-100' },
      accent: { bg: 'from-indigo-500 to-blue-600', border: 'border-indigo-400/50', glow: 'shadow-indigo-500/40', text: 'text-indigo-100' },
    },
    iron: {
      primary: { bg: 'from-slate-500 to-zinc-600', border: 'border-slate-400/50', glow: 'shadow-slate-500/40', text: 'text-slate-100' },
      secondary: { bg: 'from-zinc-500 to-gray-600', border: 'border-zinc-400/50', glow: 'shadow-zinc-500/40', text: 'text-zinc-100' },
      accent: { bg: 'from-gray-500 to-slate-600', border: 'border-gray-400/50', glow: 'shadow-gray-500/40', text: 'text-gray-100' },
    },
    blood: {
      primary: { bg: 'from-red-500 to-rose-600', border: 'border-red-400/50', glow: 'shadow-red-500/40', text: 'text-red-100' },
      secondary: { bg: 'from-rose-500 to-pink-600', border: 'border-rose-400/50', glow: 'shadow-rose-500/40', text: 'text-rose-100' },
      accent: { bg: 'from-pink-500 to-fuchsia-600', border: 'border-pink-400/50', glow: 'shadow-pink-500/40', text: 'text-pink-100' },
    },
    neon: {
      primary: { bg: 'from-pink-500 to-fuchsia-600', border: 'border-pink-400/60', glow: 'shadow-pink-500/50', text: 'text-pink-100' },
      secondary: { bg: 'from-violet-500 to-purple-600', border: 'border-violet-400/60', glow: 'shadow-violet-500/50', text: 'text-violet-100' },
      accent: { bg: 'from-cyan-400 to-blue-500', border: 'border-cyan-400/60', glow: 'shadow-cyan-500/50', text: 'text-cyan-100' },
    },
    gold: {
      primary: { bg: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/50', glow: 'shadow-yellow-500/40', text: 'text-yellow-100' },
      secondary: { bg: 'from-amber-500 to-orange-600', border: 'border-amber-400/50', glow: 'shadow-amber-500/40', text: 'text-amber-100' },
      accent: { bg: 'from-orange-500 to-red-500', border: 'border-orange-400/50', glow: 'shadow-orange-500/40', text: 'text-orange-100' },
    },
    amoled: {
      primary: { bg: 'from-gray-600 to-gray-700', border: 'border-gray-500/40', glow: 'shadow-gray-600/30', text: 'text-gray-100' },
      secondary: { bg: 'from-gray-700 to-gray-800', border: 'border-gray-600/40', glow: 'shadow-gray-600/30', text: 'text-gray-200' },
      accent: { bg: 'from-gray-600 to-gray-700', border: 'border-gray-500/40', glow: 'shadow-gray-600/30', text: 'text-gray-100' },
    },
  };
  
  return colorMap[theme][color];
};

const ThemedHomeButton: React.FC<ThemedHomeButtonProps> = memo(({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const [particles, setParticles] = useState<ParticleType[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const particleIdRef = useRef(0);
  
  const colorVariant = useMemo(() => getColorVariant(currentTheme, color), [currentTheme, color]);
  const particleColors = useMemo(() => getParticleColors(currentTheme), [currentTheme]);

  // Criar partículas que emanam do clique
  const createParticles = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newParticles: ParticleType[] = [];
    const particleCount = 10;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 360 + Math.random() * 20 - 10;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        angle,
        speed: 30 + Math.random() * 25,
        size: 2 + Math.random() * 2,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 500);
  }, [particleColors]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createParticles(event);
      playClickSound();
      onClick();
    }
  }, [disabled, createParticles, playClickSound, onClick]);

  const handleHover = () => {
    if (hoverEffectsEnabled && !disabled) {
      playHoverSound();
    }
  };

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={hoverEffectsEnabled ? { 
        scale: 1.1, 
        transition: { duration: 0.2, type: 'spring', stiffness: 400 }
      } : undefined}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'relative group overflow-visible',
        'flex flex-col items-center justify-center gap-2',
        'transition-all duration-300 ease-out',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
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

      {/* Circular button with gradient */}
      <motion.div 
        className={cn(
          'relative',
          'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20',
          'rounded-full',
          'bg-gradient-to-br',
          colorVariant.bg,
          'border-2',
          colorVariant.border,
          'flex items-center justify-center',
          'shadow-lg',
          hoverEffectsEnabled && `group-hover:shadow-xl group-hover:${colorVariant.glow}`,
          'transition-shadow duration-300'
        )}
        whileHover={hoverEffectsEnabled ? { 
          boxShadow: '0 0 25px rgba(255,255,255,0.2)'
        } : undefined}
      >
        {/* Inner glow ring */}
        <div className="absolute inset-1 rounded-full bg-white/10 blur-sm" />
        
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/5 to-white/20 pointer-events-none" />
        
        {/* Icon */}
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg relative z-10" strokeWidth={2} />
        
        {/* Pulse ring on hover */}
        <motion.div 
          className={cn(
            'absolute -inset-1 rounded-full border-2',
            colorVariant.border,
            'opacity-0 group-hover:opacity-100'
          )}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Label */}
      <span className={cn(
        'font-bebas text-xs sm:text-sm tracking-wider',
        'text-white/90 group-hover:text-white',
        'uppercase text-center',
        'transition-colors duration-300',
        'drop-shadow-sm'
      )}>
        {label}
      </span>
    </motion.button>
  );
});

ThemedHomeButton.displayName = 'ThemedHomeButton';

export default ThemedHomeButton;
