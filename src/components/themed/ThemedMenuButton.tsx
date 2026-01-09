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

// Estilos específicos por tema - apenas ícones com estilo único
const getThemeStyles = (themeId: SportTheme) => {
  const styles: Record<SportTheme, {
    iconBg: string;
    iconColor: string;
    iconBorder: string;
    glow: string;
    labelColor: string;
    hoverEffect: string;
    shape: string;
  }> = {
    fire: {
      iconBg: 'bg-gradient-to-br from-orange-500/20 via-red-500/15 to-yellow-500/10',
      iconColor: 'text-orange-400',
      iconBorder: 'border-orange-500/30',
      glow: 'shadow-orange-500/20',
      labelColor: 'text-orange-300',
      hoverEffect: 'hover:shadow-orange-500/40 hover:border-orange-400/50',
      shape: 'rounded-xl',
    },
    ocean: {
      iconBg: 'bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-teal-500/10',
      iconColor: 'text-cyan-400',
      iconBorder: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
      labelColor: 'text-cyan-300',
      hoverEffect: 'hover:shadow-cyan-500/40 hover:border-cyan-400/50',
      shape: 'rounded-2xl',
    },
    forest: {
      iconBg: 'bg-gradient-to-br from-green-500/20 via-emerald-500/15 to-lime-500/10',
      iconColor: 'text-green-400',
      iconBorder: 'border-green-500/30',
      glow: 'shadow-green-500/20',
      labelColor: 'text-green-300',
      hoverEffect: 'hover:shadow-green-500/40 hover:border-green-400/50',
      shape: 'rounded-xl',
    },
    lightning: {
      iconBg: 'bg-gradient-to-br from-yellow-400/20 via-amber-500/15 to-orange-400/10',
      iconColor: 'text-yellow-400',
      iconBorder: 'border-yellow-500/30',
      glow: 'shadow-yellow-500/20',
      labelColor: 'text-yellow-300',
      hoverEffect: 'hover:shadow-yellow-500/40 hover:border-yellow-400/50',
      shape: 'rounded-lg',
    },
    galaxy: {
      iconBg: 'bg-gradient-to-br from-purple-500/20 via-violet-500/15 to-fuchsia-500/10',
      iconColor: 'text-purple-400',
      iconBorder: 'border-purple-500/30',
      glow: 'shadow-purple-500/20',
      labelColor: 'text-purple-300',
      hoverEffect: 'hover:shadow-purple-500/40 hover:border-purple-400/50',
      shape: 'rounded-3xl',
    },
    iron: {
      iconBg: 'bg-gradient-to-br from-slate-400/20 via-zinc-500/15 to-gray-400/10',
      iconColor: 'text-slate-300',
      iconBorder: 'border-slate-400/30',
      glow: 'shadow-slate-500/15',
      labelColor: 'text-slate-300',
      hoverEffect: 'hover:shadow-slate-400/30 hover:border-slate-400/50',
      shape: 'rounded-md',
    },
    blood: {
      iconBg: 'bg-gradient-to-br from-red-600/20 via-rose-500/15 to-red-400/10',
      iconColor: 'text-red-400',
      iconBorder: 'border-red-500/30',
      glow: 'shadow-red-500/20',
      labelColor: 'text-red-300',
      hoverEffect: 'hover:shadow-red-500/40 hover:border-red-400/50',
      shape: 'rounded-xl',
    },
    neon: {
      iconBg: 'bg-gradient-to-br from-pink-500/20 via-fuchsia-500/15 to-cyan-500/10',
      iconColor: 'text-pink-400',
      iconBorder: 'border-pink-500/30',
      glow: 'shadow-pink-500/25',
      labelColor: 'text-pink-300',
      hoverEffect: 'hover:shadow-pink-500/50 hover:border-pink-400/60',
      shape: 'rounded-2xl',
    },
    gold: {
      iconBg: 'bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-orange-400/10',
      iconColor: 'text-yellow-400',
      iconBorder: 'border-yellow-500/30',
      glow: 'shadow-yellow-500/20',
      labelColor: 'text-yellow-300',
      hoverEffect: 'hover:shadow-yellow-500/40 hover:border-yellow-400/50',
      shape: 'rounded-xl',
    },
    amoled: {
      iconBg: 'bg-gradient-to-br from-white/10 via-gray-500/5 to-white/5',
      iconColor: 'text-white',
      iconBorder: 'border-white/20',
      glow: 'shadow-white/10',
      labelColor: 'text-white/90',
      hoverEffect: 'hover:shadow-white/20 hover:border-white/40',
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
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex flex-col items-center gap-2 p-3 sm:p-4',
        'bg-transparent backdrop-blur-sm',
        'transition-all duration-200',
        themeStyles.hoverEffect,
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Icon container - estilo por tema */}
      <motion.div 
        className={cn(
          'relative p-3 sm:p-4 border transition-all duration-200',
          themeStyles.iconBg,
          themeStyles.iconBorder,
          themeStyles.shape,
          `shadow-lg ${themeStyles.glow}`
        )}
        whileHover={{ 
          boxShadow: `0 0 20px ${themeStyles.glow.replace('shadow-', '').replace('/20', '/40')}` 
        }}
      >
        <Icon 
          className={cn(
            'w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9',
            color || themeStyles.iconColor
          )} 
          strokeWidth={1.8} 
        />

        {/* Badge */}
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg">
            {badge}
          </span>
        )}
      </motion.div>

      {/* Label - discreto */}
      <span className={cn(
        'font-bebas text-[10px] sm:text-xs tracking-wider text-center leading-tight',
        themeStyles.labelColor,
        fontWeightClass,
        'opacity-80'
      )}>
        {label}
      </span>
    </motion.button>
  );
});

ThemedMenuButton.displayName = 'ThemedMenuButton';

export default ThemedMenuButton;
