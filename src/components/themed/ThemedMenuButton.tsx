import React, { memo, useMemo } from 'react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ThemedMenuButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
  badge?: string | number;
  disabled?: boolean;
  tooltip?: string;
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
  disabled = false,
  tooltip
}) => {
  const { themeConfig, currentTheme } = useTheme();

  const themeStyles = useMemo(() => getThemeStyles(currentTheme), [currentTheme]);

  const fontWeightClass = themeConfig.fontWeight === 'extra-bold' 
    ? 'font-black' 
    : themeConfig.fontWeight === 'bold' 
      ? 'font-bold' 
      : 'font-medium';

  const buttonContent = (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1.5 p-2',
        'bg-transparent',
        'transition-all duration-200',
        disabled && 'opacity-50 pointer-events-none',
        'group w-full'
      )}
    >
      {/* Icon container - tamanho otimizado */}
      <motion.div 
        className={cn(
          'relative p-2.5 sm:p-3 border-2 transition-all duration-300',
          themeStyles.iconBg,
          themeStyles.iconBorder,
          themeStyles.shape,
          'group-hover:animate-pulse-glow'
        )}
        style={{
          boxShadow: `0 3px 10px ${themeStyles.glowColor}`,
        }}
      >
        <Icon 
          className={cn(
            'w-6 h-6 sm:w-7 sm:h-7',
            color || themeStyles.iconColor
          )} 
          strokeWidth={2} 
        />

        {/* Badge */}
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center shadow-lg">
            {badge}
          </span>
        )}
      </motion.div>

      {/* Label - legível e compacto */}
      <span className={cn(
        'font-bebas text-[10px] sm:text-xs tracking-wide text-center leading-tight',
        'max-w-full px-0.5 line-clamp-2',
        themeStyles.labelColor,
        fontWeightClass
      )}>
        {label}
      </span>
    </motion.button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className={cn(
            'max-w-[200px] text-center font-medium',
            themeStyles.iconBg,
            themeStyles.iconBorder,
            'border text-foreground'
          )}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
});

ThemedMenuButton.displayName = 'ThemedMenuButton';

export default ThemedMenuButton;
