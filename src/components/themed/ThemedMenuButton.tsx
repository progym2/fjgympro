import React, { memo, useMemo } from 'react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemedMenuButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
  badge?: string | number;
  disabled?: boolean;
}

// Estilos específicos por tema - cores otimizadas para legibilidade
const getThemeStyles = (themeId: SportTheme) => {
  const styles: Record<SportTheme, {
    iconBg: string;
    iconColor: string;
    iconBorder: string;
    glowColor: string;
    labelColor: string;
    shape: string;
  }> = {
    fire: {
      iconBg: 'bg-gradient-to-br from-orange-600/30 via-red-600/25 to-orange-500/20',
      iconColor: 'text-orange-500',
      iconBorder: 'border-orange-500/50',
      glowColor: 'rgba(249, 115, 22, 0.3)',
      labelColor: 'text-orange-400',
      shape: 'rounded-xl',
    },
    ocean: {
      iconBg: 'bg-gradient-to-br from-cyan-600/30 via-blue-600/25 to-teal-500/20',
      iconColor: 'text-cyan-400',
      iconBorder: 'border-cyan-500/50',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      labelColor: 'text-cyan-300',
      shape: 'rounded-2xl',
    },
    forest: {
      iconBg: 'bg-gradient-to-br from-green-600/30 via-emerald-600/25 to-green-500/20',
      iconColor: 'text-green-400',
      iconBorder: 'border-green-500/50',
      glowColor: 'rgba(34, 197, 94, 0.3)',
      labelColor: 'text-green-300',
      shape: 'rounded-xl',
    },
    lightning: {
      iconBg: 'bg-gradient-to-br from-amber-600/35 via-yellow-600/30 to-orange-500/25',
      iconColor: 'text-amber-400',
      iconBorder: 'border-amber-500/60',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      labelColor: 'text-amber-300',
      shape: 'rounded-lg',
    },
    galaxy: {
      iconBg: 'bg-gradient-to-br from-purple-600/30 via-violet-600/25 to-fuchsia-500/20',
      iconColor: 'text-purple-400',
      iconBorder: 'border-purple-500/50',
      glowColor: 'rgba(168, 85, 247, 0.3)',
      labelColor: 'text-purple-300',
      shape: 'rounded-3xl',
    },
    iron: {
      iconBg: 'bg-gradient-to-br from-zinc-700/40 via-slate-700/35 to-zinc-600/30',
      iconColor: 'text-white',
      iconBorder: 'border-zinc-500/60',
      glowColor: 'rgba(161, 161, 170, 0.25)',
      labelColor: 'text-zinc-200',
      shape: 'rounded-md',
    },
    blood: {
      iconBg: 'bg-gradient-to-br from-red-700/35 via-rose-600/30 to-red-500/25',
      iconColor: 'text-red-400',
      iconBorder: 'border-red-500/55',
      glowColor: 'rgba(220, 38, 38, 0.3)',
      labelColor: 'text-red-300',
      shape: 'rounded-xl',
    },
    neon: {
      iconBg: 'bg-gradient-to-br from-pink-600/35 via-fuchsia-600/30 to-violet-500/25',
      iconColor: 'text-pink-400',
      iconBorder: 'border-pink-500/60',
      glowColor: 'rgba(236, 72, 153, 0.35)',
      labelColor: 'text-pink-300',
      shape: 'rounded-2xl',
    },
    gold: {
      iconBg: 'bg-gradient-to-br from-amber-600/35 via-yellow-600/30 to-orange-500/25',
      iconColor: 'text-amber-400',
      iconBorder: 'border-amber-500/60',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      labelColor: 'text-amber-300',
      shape: 'rounded-xl',
    },
    amoled: {
      iconBg: 'bg-gradient-to-br from-white/20 via-gray-400/15 to-white/10',
      iconColor: 'text-white',
      iconBorder: 'border-white/40',
      glowColor: 'rgba(255, 255, 255, 0.15)',
      labelColor: 'text-white',
      shape: 'rounded-lg',
    },
  };
  return styles[themeId] || styles.fire;
};

export const ThemedMenuButton: React.FC<ThemedMenuButtonProps> = memo(({
  icon: Icon,
  label,
  onClick,
  color,
  badge,
  disabled = false
}) => {
  const { themeConfig, currentTheme } = useTheme();

  const themeStyles = useMemo(() => getThemeStyles(currentTheme), [currentTheme]);

  const fontWeightClass = themeConfig.fontWeight === 'extra-bold' 
    ? 'font-black' 
    : themeConfig.fontWeight === 'bold' 
      ? 'font-bold' 
      : 'font-medium';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex flex-col items-center gap-2.5 p-3 sm:p-4',
        'bg-transparent',
        'transition-all duration-200',
        disabled && 'opacity-50 pointer-events-none',
        'group'
      )}
    >
      {/* Icon container - tamanho aumentado com glow pulsante */}
      <motion.div 
        className={cn(
          'relative p-4 sm:p-5 md:p-6 border-2 transition-all duration-300',
          themeStyles.iconBg,
          themeStyles.iconBorder,
          themeStyles.shape,
          'group-hover:animate-pulse-glow'
        )}
        style={{
          boxShadow: `0 6px 20px ${themeStyles.glowColor}`,
        }}
      >
        <Icon 
          className={cn(
            'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
            color || themeStyles.iconColor
          )} 
          strokeWidth={1.8} 
        />

        {/* Badge */}
        {badge && (
          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg">
            {badge}
          </span>
        )}
      </motion.div>

      {/* Label - maior e mais legível */}
      <span className={cn(
        'font-bebas text-xs sm:text-sm md:text-base tracking-wider text-center leading-tight',
        themeStyles.labelColor,
        fontWeightClass
      )}>
        {label}
      </span>
    </motion.button>
  );
});

ThemedMenuButton.displayName = 'ThemedMenuButton';

export default ThemedMenuButton;
