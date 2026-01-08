import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ThemedMenuButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
  badge?: string | number;
  disabled?: boolean;
}

const getCardShape = (style: string): string => {
  switch (style) {
    case 'sharp':
      return 'rounded-sm';
    case 'hexagonal':
      return 'rounded-lg [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]';
    case 'beveled':
      return 'rounded-xl [clip-path:polygon(0_12px,12px_0,calc(100%-12px)_0,100%_12px,100%_calc(100%-12px),calc(100%-12px)_100%,12px_100%,0_calc(100%-12px))]';
    case 'organic':
      return 'rounded-[1.5rem]';
    default:
      return 'rounded-xl';
  }
};

const getBorderStyle = (style: string): string => {
  switch (style) {
    case 'sharp':
      return 'border-l-4 border-l-primary border-y border-r border-border/50';
    case 'beveled':
      return 'border-2 border-primary/30';
    case 'hexagonal':
      return 'border-0';
    default:
      return 'border border-border/50';
  }
};

export const ThemedMenuButton: React.FC<ThemedMenuButtonProps> = memo(({
  icon: Icon,
  label,
  onClick,
  color = 'text-primary',
  badge,
  disabled = false
}) => {
  const { themeConfig } = useTheme();

  const fontWeightClass = themeConfig.fontWeight === 'extra-bold' 
    ? 'font-black' 
    : themeConfig.fontWeight === 'bold' 
      ? 'font-bold' 
      : 'font-medium';

  // Modern gym-style icon backgrounds with gradient
  const iconBackground = useMemo(() => {
    switch (themeConfig.id) {
      case 'fire':
        return 'bg-gradient-to-br from-orange-500/30 to-red-600/20 border border-orange-500/30';
      case 'ocean':
        return 'bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border border-cyan-500/30';
      case 'forest':
        return 'bg-gradient-to-br from-green-500/30 to-emerald-600/20 border border-green-500/30';
      case 'lightning':
        return 'bg-gradient-to-br from-yellow-400/30 to-amber-500/20 border border-yellow-400/30';
      case 'galaxy':
        return 'bg-gradient-to-br from-purple-500/30 to-violet-600/20 border border-purple-500/30';
      case 'iron':
        return 'bg-gradient-to-br from-slate-400/30 to-zinc-600/20 border border-slate-400/30';
      case 'blood':
        return 'bg-gradient-to-br from-red-600/30 to-rose-800/20 border border-red-600/30';
      case 'neon':
        return 'bg-gradient-to-br from-pink-500/30 to-fuchsia-600/20 border border-pink-500/30';
      case 'gold':
        return 'bg-gradient-to-br from-yellow-500/30 to-orange-500/20 border border-yellow-500/30';
      default:
        return 'bg-primary/15 border border-primary/30';
    }
  }, [themeConfig.id]);

  const iconStyleClasses = themeConfig.icons.style === 'glow' 
    ? 'drop-shadow-[0_0_8px_currentColor]' 
    : themeConfig.icons.style === 'filled'
      ? 'fill-current opacity-80'
      : '';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative p-3 sm:p-4 md:p-5 bg-card/90 backdrop-blur-md',
        'flex flex-col items-center gap-2 sm:gap-3',
        'transition-all duration-200 shadow-lg group',
        getCardShape(themeConfig.cardStyle),
        getBorderStyle(themeConfig.cardStyle),
        'hover:border-primary/50 hover:shadow-primary/30 hover:shadow-xl',
        disabled && 'opacity-50 pointer-events-none',
        // Modern gym-style accent line at top
        'before:absolute before:top-0 before:left-1/4 before:right-1/4 before:h-[2px]',
        'before:bg-gradient-to-r before:from-transparent before:via-primary/50 before:to-transparent',
        'before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100'
      )}
      whileHover={{ 
        scale: 1.03,
        y: -3,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 20 
      }}
    >
      {/* Background shimmer effect on hover */}
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
        getCardShape(themeConfig.cardStyle),
        'overflow-hidden'
      )}>
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, transparent 40%, hsl(${themeConfig.primary} / 0.1) 50%, transparent 60%)`
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1.5,
          }}
        />
      </div>

      {/* Icon container with themed background */}
      <div className={cn(
        'relative p-2.5 sm:p-3 rounded-lg sm:rounded-xl',
        iconBackground
      )}>
        <motion.div
          animate={themeConfig.icons.style === 'glow' ? {
            filter: [
              'drop-shadow(0 0 4px currentColor)',
              'drop-shadow(0 0 12px currentColor)',
              'drop-shadow(0 0 4px currentColor)',
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className={cn(
            color,
            'w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10',
            iconStyleClasses
          )} strokeWidth={2.5} />
        </motion.div>

        {/* Badge */}
        {badge && (
          <motion.span 
            className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            {badge}
          </motion.span>
        )}
      </div>

      {/* Label */}
      <span className={cn(
        'font-bebas text-[11px] sm:text-sm md:text-base tracking-wider text-center leading-tight line-clamp-2',
        fontWeightClass
      )}>
        {label}
      </span>

      {/* Subtle glow effect on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 30%, hsl(${themeConfig.primary} / 0.15), transparent 60%)`
        }}
        initial={false}
      />
    </motion.button>
  );
});

ThemedMenuButton.displayName = 'ThemedMenuButton';

export default ThemedMenuButton;
