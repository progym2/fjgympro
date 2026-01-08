import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';

interface ModernGymButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

// Theme-aware color configurations
const getColorConfig = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent') => {
  const configs: Record<SportTheme, Record<string, { gradient: string; accent: string; glow: string }>> = {
    fire: {
      primary: { gradient: 'from-orange-500 via-red-500 to-orange-600', accent: 'bg-orange-400', glow: 'shadow-orange-500/40' },
      secondary: { gradient: 'from-emerald-500 via-green-500 to-emerald-600', accent: 'bg-emerald-400', glow: 'shadow-emerald-500/40' },
      accent: { gradient: 'from-cyan-500 via-blue-500 to-cyan-600', accent: 'bg-cyan-400', glow: 'shadow-cyan-500/40' },
    },
    ocean: {
      primary: { gradient: 'from-cyan-500 via-blue-500 to-cyan-600', accent: 'bg-cyan-400', glow: 'shadow-cyan-500/40' },
      secondary: { gradient: 'from-teal-500 via-emerald-500 to-teal-600', accent: 'bg-teal-400', glow: 'shadow-teal-500/40' },
      accent: { gradient: 'from-indigo-500 via-violet-500 to-indigo-600', accent: 'bg-indigo-400', glow: 'shadow-indigo-500/40' },
    },
    forest: {
      primary: { gradient: 'from-emerald-500 via-green-500 to-emerald-600', accent: 'bg-emerald-400', glow: 'shadow-emerald-500/40' },
      secondary: { gradient: 'from-lime-500 via-green-400 to-lime-600', accent: 'bg-lime-400', glow: 'shadow-lime-500/40' },
      accent: { gradient: 'from-teal-500 via-cyan-500 to-teal-600', accent: 'bg-teal-400', glow: 'shadow-teal-500/40' },
    },
    lightning: {
      primary: { gradient: 'from-yellow-400 via-amber-500 to-yellow-500', accent: 'bg-yellow-300', glow: 'shadow-yellow-400/40' },
      secondary: { gradient: 'from-orange-500 via-red-500 to-orange-600', accent: 'bg-orange-400', glow: 'shadow-orange-500/40' },
      accent: { gradient: 'from-amber-400 via-yellow-500 to-amber-500', accent: 'bg-amber-300', glow: 'shadow-amber-400/40' },
    },
    galaxy: {
      primary: { gradient: 'from-purple-500 via-violet-500 to-purple-600', accent: 'bg-purple-400', glow: 'shadow-purple-500/40' },
      secondary: { gradient: 'from-pink-500 via-fuchsia-500 to-pink-600', accent: 'bg-pink-400', glow: 'shadow-pink-500/40' },
      accent: { gradient: 'from-indigo-500 via-blue-500 to-indigo-600', accent: 'bg-indigo-400', glow: 'shadow-indigo-500/40' },
    },
    iron: {
      primary: { gradient: 'from-slate-500 via-zinc-500 to-slate-600', accent: 'bg-slate-400', glow: 'shadow-slate-500/40' },
      secondary: { gradient: 'from-zinc-500 via-gray-500 to-zinc-600', accent: 'bg-zinc-400', glow: 'shadow-zinc-500/40' },
      accent: { gradient: 'from-stone-500 via-neutral-500 to-stone-600', accent: 'bg-stone-400', glow: 'shadow-stone-500/40' },
    },
    blood: {
      primary: { gradient: 'from-red-500 via-rose-600 to-red-600', accent: 'bg-red-400', glow: 'shadow-red-500/40' },
      secondary: { gradient: 'from-rose-500 via-pink-500 to-rose-600', accent: 'bg-rose-400', glow: 'shadow-rose-500/40' },
      accent: { gradient: 'from-pink-500 via-red-500 to-pink-600', accent: 'bg-pink-400', glow: 'shadow-pink-500/40' },
    },
    neon: {
      primary: { gradient: 'from-pink-500 via-fuchsia-500 to-pink-600', accent: 'bg-pink-400', glow: 'shadow-pink-500/40' },
      secondary: { gradient: 'from-violet-500 via-purple-500 to-violet-600', accent: 'bg-violet-400', glow: 'shadow-violet-500/40' },
      accent: { gradient: 'from-cyan-400 via-blue-500 to-cyan-500', accent: 'bg-cyan-400', glow: 'shadow-cyan-500/40' },
    },
    gold: {
      primary: { gradient: 'from-yellow-500 via-amber-500 to-yellow-600', accent: 'bg-yellow-400', glow: 'shadow-yellow-500/40' },
      secondary: { gradient: 'from-amber-500 via-orange-500 to-amber-600', accent: 'bg-amber-400', glow: 'shadow-amber-500/40' },
      accent: { gradient: 'from-orange-500 via-yellow-500 to-orange-600', accent: 'bg-orange-400', glow: 'shadow-orange-500/40' },
    },
  };
  
  return configs[theme][color];
};

const ModernGymButton: React.FC<ModernGymButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const config = getColorConfig(currentTheme, color);

  const handleClick = () => {
    if (!disabled) {
      playClickSound();
      onClick();
    }
  };

  const handleHover = () => {
    if (hoverEffectsEnabled && !disabled) {
      playHoverSound();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      className={cn(
        // Base structure - hexagonal/badge shape
        'relative group',
        'flex flex-col items-center justify-center',
        'w-24 h-28 sm:w-28 sm:h-32 md:w-32 md:h-36',
        // Clip path for unique shape - rounded hexagon/shield
        '[clip-path:polygon(50%_0%,95%_15%,95%_75%,50%_100%,5%_75%,5%_15%)]',
        // Background
        'bg-gradient-to-b from-black/80 via-black/70 to-black/90',
        // Transitions
        'transition-all duration-300 ease-out',
        // Hover effects
        hoverEffectsEnabled && 'hover:scale-105 hover:-translate-y-1',
        // Active state
        'active:scale-95',
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      {/* Gradient border effect */}
      <div className={cn(
        'absolute inset-[2px]',
        '[clip-path:polygon(50%_0%,95%_15%,95%_75%,50%_100%,5%_75%,5%_15%)]',
        'bg-gradient-to-br',
        config.gradient,
        'opacity-20 group-hover:opacity-40 transition-opacity duration-300'
      )} />

      {/* Inner content area */}
      <div className={cn(
        'absolute inset-[3px]',
        '[clip-path:polygon(50%_0%,95%_15%,95%_75%,50%_100%,5%_75%,5%_15%)]',
        'bg-gradient-to-b from-gray-900/95 via-black/95 to-gray-900/95',
        'flex flex-col items-center justify-center gap-2 p-2'
      )}>
        {/* Accent line at top */}
        <div className={cn(
          'absolute top-3 left-1/2 -translate-x-1/2',
          'w-8 h-0.5 rounded-full',
          config.accent,
          'opacity-60 group-hover:opacity-100 group-hover:w-12',
          'transition-all duration-300'
        )} />

        {/* Icon container */}
        <div className={cn(
          'relative z-10 mt-2',
          'w-12 h-12 sm:w-14 sm:h-14',
          'rounded-xl',
          'bg-gradient-to-br from-white/10 to-white/5',
          'border border-white/10',
          'flex items-center justify-center',
          'group-hover:border-white/20 group-hover:from-white/15 group-hover:to-white/10',
          'transition-all duration-300',
          // Glow on hover
          hoverEffectsEnabled && `group-hover:shadow-lg ${config.glow}`
        )}>
          <Icon
            className={cn(
              'w-6 h-6 sm:w-7 sm:h-7',
              'text-white/90 group-hover:text-white',
              'transition-all duration-300',
              hoverEffectsEnabled && 'group-hover:scale-110'
            )}
            strokeWidth={2}
          />
        </div>

        {/* Label */}
        <span className={cn(
          'relative z-10',
          'font-bebas text-xs sm:text-sm tracking-widest',
          'text-white/80 group-hover:text-white',
          'uppercase text-center',
          'transition-colors duration-300'
        )}>
          {label}
        </span>

        {/* Bottom accent dots */}
        <div className="absolute bottom-4 flex gap-1">
          <div className={cn('w-1 h-1 rounded-full', config.accent, 'opacity-40 group-hover:opacity-80 transition-opacity')} />
          <div className={cn('w-1.5 h-1.5 rounded-full', config.accent, 'opacity-60 group-hover:opacity-100 transition-opacity')} />
          <div className={cn('w-1 h-1 rounded-full', config.accent, 'opacity-40 group-hover:opacity-80 transition-opacity')} />
        </div>
      </div>

      {/* Outer glow on hover */}
      <div className={cn(
        'absolute -inset-2 -z-10',
        'rounded-3xl blur-xl',
        'bg-gradient-to-br',
        config.gradient,
        'opacity-0 group-hover:opacity-30',
        'transition-opacity duration-500'
      )} />
    </button>
  );
};

export default ModernGymButton;