import React, { memo, useMemo, useState, useRef, useCallback } from 'react';
import { LucideIcon, Dumbbell, User, Shield, Heart, Flame, Waves, TreePine, Zap, Sparkles, Trophy } from 'lucide-react';
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

// Ícones fitness por tema e tipo de botão
const getFitnessIcon = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent'): LucideIcon => {
  const iconMap: Record<SportTheme, Record<string, LucideIcon>> = {
    fire: { primary: User, secondary: Dumbbell, accent: Shield },
    ocean: { primary: User, secondary: Waves, accent: Shield },
    forest: { primary: User, secondary: TreePine, accent: Shield },
    lightning: { primary: User, secondary: Zap, accent: Shield },
    galaxy: { primary: User, secondary: Sparkles, accent: Shield },
    iron: { primary: User, secondary: Dumbbell, accent: Shield },
    blood: { primary: User, secondary: Heart, accent: Shield },
    neon: { primary: User, secondary: Sparkles, accent: Shield },
    gold: { primary: User, secondary: Trophy, accent: Shield },
    amoled: { primary: User, secondary: Dumbbell, accent: Shield },
  };
  return iconMap[theme]?.[color] || User;
};

// Cores das partículas por tema
const getParticleColors = (theme: SportTheme): string[] => {
  const colorMap: Record<SportTheme, string[]> = {
    fire: ['#FF6B35', '#FF9F1C', '#FFCC00'],
    ocean: ['#00D4FF', '#0099CC', '#66E0FF'],
    forest: ['#10B981', '#34D399', '#6EE7B7'],
    lightning: ['#FBBF24', '#FCD34D', '#FDE68A'],
    galaxy: ['#A855F7', '#C084FC', '#E879F9'],
    iron: ['#94A3B8', '#CBD5E1', '#E2E8F0'],
    blood: ['#EF4444', '#F87171', '#FCA5A5'],
    neon: ['#F472B6', '#E879F9', '#A78BFA'],
    gold: ['#FBBF24', '#F59E0B', '#D97706'],
    amoled: ['#6B7280', '#9CA3AF', '#D1D5DB'],
  };
  return colorMap[theme] || colorMap.fire;
};

// Cores de gradiente por tipo
const getGradient = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent'): string => {
  const gradients: Record<SportTheme, Record<string, string>> = {
    fire: { 
      primary: 'from-orange-500 to-red-600', 
      secondary: 'from-emerald-500 to-teal-600', 
      accent: 'from-blue-500 to-indigo-600' 
    },
    ocean: { 
      primary: 'from-cyan-500 to-blue-600', 
      secondary: 'from-teal-500 to-cyan-600', 
      accent: 'from-indigo-500 to-purple-600' 
    },
    forest: { 
      primary: 'from-emerald-500 to-green-600', 
      secondary: 'from-lime-500 to-emerald-600', 
      accent: 'from-teal-500 to-green-600' 
    },
    lightning: { 
      primary: 'from-yellow-400 to-orange-500', 
      secondary: 'from-amber-500 to-yellow-600', 
      accent: 'from-orange-500 to-red-500' 
    },
    galaxy: { 
      primary: 'from-purple-500 to-violet-600', 
      secondary: 'from-pink-500 to-purple-600', 
      accent: 'from-indigo-500 to-purple-600' 
    },
    iron: { 
      primary: 'from-slate-500 to-zinc-600', 
      secondary: 'from-zinc-500 to-slate-600', 
      accent: 'from-gray-500 to-zinc-600' 
    },
    blood: { 
      primary: 'from-red-500 to-rose-700', 
      secondary: 'from-rose-500 to-red-700', 
      accent: 'from-pink-500 to-rose-600' 
    },
    neon: { 
      primary: 'from-pink-500 to-fuchsia-600', 
      secondary: 'from-violet-500 to-purple-600', 
      accent: 'from-cyan-400 to-blue-500' 
    },
    gold: { 
      primary: 'from-yellow-500 to-amber-600', 
      secondary: 'from-amber-500 to-orange-600', 
      accent: 'from-orange-500 to-yellow-600' 
    },
    amoled: { 
      primary: 'from-gray-600 to-gray-800', 
      secondary: 'from-zinc-600 to-gray-800', 
      accent: 'from-slate-600 to-gray-800' 
    },
  };
  return gradients[theme]?.[color] || 'from-gray-500 to-gray-700';
};

const ThemedHomeButton: React.FC<ThemedHomeButtonProps> = memo(({
  onClick,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const [particles, setParticles] = useState<ParticleType[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const particleIdRef = useRef(0);
  
  const Icon = useMemo(() => getFitnessIcon(currentTheme, color), [currentTheme, color]);
  const gradient = useMemo(() => getGradient(currentTheme, color), [currentTheme, color]);
  const particleColors = useMemo(() => getParticleColors(currentTheme), [currentTheme]);

  const createParticles = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newParticles: ParticleType[] = [];
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 360;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        angle,
        speed: 25 + Math.random() * 20,
        size: 2 + Math.random() * 2,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 400);
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={hoverEffectsEnabled ? { scale: 1.08 } : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative group overflow-visible',
        'flex flex-col items-center justify-center gap-1.5',
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
              animate={{ scale: 0, opacity: 0, x: endX, y: endY }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          );
        })}
      </AnimatePresence>

      {/* Circular button */}
      <div className={cn(
        'relative',
        'w-14 h-14 sm:w-16 sm:h-16',
        'rounded-full',
        'bg-gradient-to-br',
        gradient,
        'flex items-center justify-center',
        'shadow-lg',
        'border border-white/20',
        'transition-shadow duration-200',
        hoverEffectsEnabled && 'group-hover:shadow-xl group-hover:shadow-primary/30'
      )}>
        {/* Shine overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/20 pointer-events-none" />
        
        {/* Icon */}
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-md relative z-10" strokeWidth={2} />
      </div>

      {/* Label */}
      <span className={cn(
        'font-bebas text-[10px] sm:text-xs tracking-wide',
        'text-white/90 group-hover:text-white',
        'uppercase text-center',
        'transition-colors duration-200'
      )}>
        {label}
      </span>
    </motion.button>
  );
});

ThemedHomeButton.displayName = 'ThemedHomeButton';

export default ThemedHomeButton;
