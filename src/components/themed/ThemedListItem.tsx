import React, { memo, useMemo } from 'react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemedListItemProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  color?: string;
  badge?: string | number;
  disabled?: boolean;
}

// Estilos específicos por tema
const getThemeStyles = (themeId: SportTheme) => {
  const styles: Record<SportTheme, {
    iconBg: string;
    iconColor: string;
    borderColor: string;
    glowColor: string;
    labelColor: string;
    hoverBg: string;
  }> = {
    fire: {
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-500',
      borderColor: 'border-orange-500/30',
      glowColor: 'rgba(249, 115, 22, 0.2)',
      labelColor: 'text-orange-400',
      hoverBg: 'hover:bg-orange-500/10',
    },
    ocean: {
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      glowColor: 'rgba(6, 182, 212, 0.2)',
      labelColor: 'text-cyan-300',
      hoverBg: 'hover:bg-cyan-500/10',
    },
    forest: {
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/30',
      glowColor: 'rgba(34, 197, 94, 0.2)',
      labelColor: 'text-green-300',
      hoverBg: 'hover:bg-green-500/10',
    },
    lightning: {
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      glowColor: 'rgba(245, 158, 11, 0.2)',
      labelColor: 'text-amber-300',
      hoverBg: 'hover:bg-amber-500/10',
    },
    galaxy: {
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      glowColor: 'rgba(168, 85, 247, 0.2)',
      labelColor: 'text-purple-300',
      hoverBg: 'hover:bg-purple-500/10',
    },
    iron: {
      iconBg: 'bg-zinc-500/20',
      iconColor: 'text-white',
      borderColor: 'border-zinc-500/30',
      glowColor: 'rgba(161, 161, 170, 0.2)',
      labelColor: 'text-zinc-200',
      hoverBg: 'hover:bg-zinc-500/10',
    },
    blood: {
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      borderColor: 'border-red-500/30',
      glowColor: 'rgba(220, 38, 38, 0.2)',
      labelColor: 'text-red-300',
      hoverBg: 'hover:bg-red-500/10',
    },
    neon: {
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/30',
      glowColor: 'rgba(236, 72, 153, 0.2)',
      labelColor: 'text-pink-300',
      hoverBg: 'hover:bg-pink-500/10',
    },
    gold: {
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      glowColor: 'rgba(245, 158, 11, 0.2)',
      labelColor: 'text-amber-300',
      hoverBg: 'hover:bg-amber-500/10',
    },
    amoled: {
      iconBg: 'bg-white/15',
      iconColor: 'text-white',
      borderColor: 'border-white/20',
      glowColor: 'rgba(255, 255, 255, 0.1)',
      labelColor: 'text-white',
      hoverBg: 'hover:bg-white/5',
    },
  };
  return styles[themeId] || styles.fire;
};

export const ThemedListItem: React.FC<ThemedListItemProps> = memo(({
  icon: Icon,
  label,
  description,
  onClick,
  color,
  badge,
  disabled = false,
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = useMemo(() => getThemeStyles(currentTheme), [currentTheme]);

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
        'bg-card/50 backdrop-blur-sm',
        themeStyles.borderColor,
        themeStyles.hoverBg,
        disabled && 'opacity-50 pointer-events-none',
        'group'
      )}
    >
      {/* Icon */}
      <div 
        className={cn(
          'relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border',
          themeStyles.iconBg,
          themeStyles.borderColor
        )}
        style={{
          boxShadow: `0 4px 12px ${themeStyles.glowColor}`,
        }}
      >
        <Icon 
          className={cn('w-5 h-5', color || themeStyles.iconColor)} 
          strokeWidth={2} 
        />
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-left min-w-0">
        <span className={cn(
          'font-bebas text-sm tracking-wide block truncate',
          themeStyles.labelColor
        )}>
          {label}
        </span>
        {description && (
          <span className="text-[10px] text-muted-foreground block truncate">
            {description}
          </span>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight 
        size={16} 
        className={cn(
          'flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity',
          themeStyles.iconColor
        )} 
      />
    </motion.button>
  );
});

ThemedListItem.displayName = 'ThemedListItem';

export default ThemedListItem;
