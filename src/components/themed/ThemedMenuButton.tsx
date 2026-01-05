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
      return 'rounded-xl [clip-path:polygon(0_15px,15px_0,calc(100%-15px)_0,100%_15px,100%_calc(100%-15px),calc(100%-15px)_100%,15px_100%,0_calc(100%-15px))]';
    case 'organic':
      return 'rounded-[2rem]';
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

  // Memoize icon background to prevent recalculation
  const iconBackground = useMemo(() => {
    switch (themeConfig.id) {
      case 'fire':
        return 'bg-gradient-to-br from-orange-500/20 to-red-600/20';
      case 'ocean':
        return 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20';
      case 'forest':
        return 'bg-gradient-to-br from-green-500/20 to-emerald-600/20';
      case 'lightning':
        return 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20';
      case 'galaxy':
        return 'bg-gradient-to-br from-purple-500/20 to-violet-600/20';
      case 'iron':
        return 'bg-gradient-to-br from-slate-400/20 to-zinc-600/20';
      case 'blood':
        return 'bg-gradient-to-br from-red-600/20 to-rose-800/20';
      case 'neon':
        return 'bg-gradient-to-br from-pink-500/20 to-fuchsia-600/20';
      case 'gold':
        return 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20';
      default:
        return 'bg-primary/10';
    }
  }, [themeConfig.id]);

  const iconStyleClasses = themeConfig.icons.style === 'glow' 
    ? 'drop-shadow-[0_0_6px_currentColor]' 
    : themeConfig.icons.style === 'filled'
      ? 'fill-current opacity-80'
      : '';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative p-4 sm:p-5 md:p-6 bg-card/80 backdrop-blur-md',
        'flex flex-col items-center gap-3 sm:gap-4',
        'transition-all duration-200 shadow-md group',
        getCardShape(themeConfig.cardStyle),
        getBorderStyle(themeConfig.cardStyle),
        'hover:border-primary/50 hover:shadow-primary/20',
        disabled && 'opacity-50 pointer-events-none'
      )}
      whileHover={{ 
        scale: 1.05,
        y: -4,
        boxShadow: `0 20px 40px -10px hsl(${themeConfig.primary} / var(--theme-glow-intensity))`
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 17 
      }}
    >
      {/* Background pattern based on theme */}
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        getCardShape(themeConfig.cardStyle),
        'overflow-hidden'
      )}>
        {themeConfig.pattern === 'circuit' && (
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
              linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />
        )}
        {themeConfig.pattern === 'lines' && (
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              hsl(var(--primary) / 0.2) 8px,
              hsl(var(--primary) / 0.2) 16px
            )`
          }} />
        )}
      </div>

      {/* Icon container with themed background */}
      <div className={cn(
        'relative p-3 rounded-xl',
        iconBackground
      )}>
        <motion.div
          animate={themeConfig.icons.style === 'glow' ? {
            filter: [
              'drop-shadow(0 0 4px currentColor)',
              'drop-shadow(0 0 10px currentColor)',
              'drop-shadow(0 0 4px currentColor)',
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className={cn(
            color,
            'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
            iconStyleClasses
          )} />
        </motion.div>

        {/* Badge */}
        {badge && (
          <motion.span 
            className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full"
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
        'font-bebas text-sm sm:text-base md:text-lg tracking-wider text-center leading-tight line-clamp-2',
        fontWeightClass
      )}>
        {label}
      </span>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(${themeConfig.primary} / 0.1), transparent 70%)`
        }}
        initial={false}
        animate={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      />
    </motion.button>
  );
});

ThemedMenuButton.displayName = 'ThemedMenuButton';

export default ThemedMenuButton;
