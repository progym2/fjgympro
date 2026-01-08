import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';

interface ModernGymButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

// Clean, minimal theme colors
const getButtonStyle = (theme: SportTheme, color: 'primary' | 'secondary' | 'accent') => {
  const styles: Record<SportTheme, Record<string, { bg: string; border: string; text: string; glow: string }>> = {
    fire: {
      primary: { bg: 'from-orange-600 to-red-700', border: 'border-orange-500/50', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
      secondary: { bg: 'from-emerald-600 to-emerald-700', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
      accent: { bg: 'from-cyan-600 to-blue-700', border: 'border-cyan-500/50', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    },
    ocean: {
      primary: { bg: 'from-cyan-600 to-blue-700', border: 'border-cyan-500/50', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
      secondary: { bg: 'from-teal-600 to-teal-700', border: 'border-teal-500/50', text: 'text-teal-400', glow: 'shadow-teal-500/20' },
      accent: { bg: 'from-sky-600 to-indigo-700', border: 'border-sky-500/50', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
    },
    forest: {
      primary: { bg: 'from-emerald-600 to-green-700', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
      secondary: { bg: 'from-lime-600 to-lime-700', border: 'border-lime-500/50', text: 'text-lime-400', glow: 'shadow-lime-500/20' },
      accent: { bg: 'from-teal-600 to-emerald-700', border: 'border-teal-500/50', text: 'text-teal-400', glow: 'shadow-teal-500/20' },
    },
    lightning: {
      primary: { bg: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
      secondary: { bg: 'from-orange-500 to-red-600', border: 'border-orange-400/50', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
      accent: { bg: 'from-amber-500 to-yellow-600', border: 'border-amber-400/50', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    },
    galaxy: {
      primary: { bg: 'from-purple-600 to-indigo-700', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
      secondary: { bg: 'from-pink-600 to-fuchsia-700', border: 'border-pink-500/50', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
      accent: { bg: 'from-indigo-600 to-violet-700', border: 'border-indigo-500/50', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
    },
    iron: {
      primary: { bg: 'from-slate-600 to-zinc-700', border: 'border-slate-500/50', text: 'text-slate-300', glow: 'shadow-slate-500/20' },
      secondary: { bg: 'from-zinc-600 to-gray-700', border: 'border-zinc-500/50', text: 'text-zinc-300', glow: 'shadow-zinc-500/20' },
      accent: { bg: 'from-stone-600 to-stone-700', border: 'border-stone-500/50', text: 'text-stone-300', glow: 'shadow-stone-500/20' },
    },
    blood: {
      primary: { bg: 'from-red-600 to-rose-800', border: 'border-red-500/50', text: 'text-red-400', glow: 'shadow-red-500/20' },
      secondary: { bg: 'from-rose-600 to-red-700', border: 'border-rose-500/50', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
      accent: { bg: 'from-pink-600 to-rose-700', border: 'border-pink-500/50', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
    },
    neon: {
      primary: { bg: 'from-pink-600 to-fuchsia-700', border: 'border-pink-500/50', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
      secondary: { bg: 'from-violet-600 to-purple-700', border: 'border-violet-500/50', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
      accent: { bg: 'from-fuchsia-600 to-pink-700', border: 'border-fuchsia-500/50', text: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/20' },
    },
    gold: {
      primary: { bg: 'from-yellow-600 to-amber-700', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
      secondary: { bg: 'from-amber-600 to-yellow-700', border: 'border-amber-500/50', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
      accent: { bg: 'from-orange-600 to-amber-700', border: 'border-orange-500/50', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
    },
  };
  
  return styles[theme][color];
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
  const style = getButtonStyle(currentTheme, color);

  const handleClick = () => {
    if (!disabled) {
      playClickSound();
      onClick();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      onHoverStart={() => hoverEffectsEnabled && !disabled && playHoverSound()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverEffectsEnabled && !disabled ? { scale: 1.05, y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative flex flex-col items-center gap-2 p-4 sm:p-5
        rounded-2xl
        bg-gradient-to-br ${style.bg}
        border ${style.border}
        shadow-lg ${style.glow}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-shadow duration-300
        hover:shadow-xl
        group
      `}
    >
      {/* Icon container */}
      <div className="relative">
        <div className={`
          w-14 h-14 sm:w-16 sm:h-16
          rounded-xl
          bg-black/30 backdrop-blur-sm
          border border-white/10
          flex items-center justify-center
          transition-transform duration-300
          ${hoverEffectsEnabled ? 'group-hover:scale-110' : ''}
        `}>
          <Icon
            className="w-7 h-7 sm:w-8 sm:h-8 text-white"
            strokeWidth={2}
          />
        </div>
        
        {/* Subtle corner accent */}
        <div className={`
          absolute -top-1 -right-1
          w-3 h-3 rounded-full
          bg-gradient-to-br ${style.bg}
          border border-white/20
          opacity-70
        `} />
      </div>

      {/* Label */}
      <span className="font-bebas text-sm sm:text-base tracking-wider text-white/90 uppercase">
        {label}
      </span>
    </motion.button>
  );
};

export default ModernGymButton;