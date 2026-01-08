import React, { memo, useMemo } from 'react';
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
      return 'rounded-lg';
    case 'beveled':
      return 'rounded-xl';
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
      return 'border border-primary/20';
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

  // Modern gym-style icon backgrounds
  const iconBackground = useMemo(() => {
    switch (themeConfig.id) {
      case 'fire':
        return 'bg-gradient-to-br from-orange-500/20 to-red-600/10 border border-orange-500/20';
      case 'ocean':
        return 'bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/20';
      case 'forest':
        return 'bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/20';
      case 'lightning':
        return 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-400/20';
      case 'galaxy':
        return 'bg-gradient-to-br from-purple-500/20 to-violet-600/10 border border-purple-500/20';
      case 'iron':
        return 'bg-gradient-to-br from-slate-400/20 to-zinc-600/10 border border-slate-400/20';
      case 'blood':
        return 'bg-gradient-to-br from-red-600/20 to-rose-800/10 border border-red-600/20';
      case 'neon':
        return 'bg-gradient-to-br from-pink-500/20 to-fuchsia-600/10 border border-pink-500/20';
      case 'gold':
        return 'bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20';
      default:
        return 'bg-primary/10 border border-primary/20';
    }
  }, [themeConfig.id]);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative p-3 sm:p-4 md:p-5 bg-card/90 backdrop-blur-sm',
        'flex flex-col items-center gap-2 sm:gap-3',
        'transition-all duration-150 shadow-md',
        getCardShape(themeConfig.cardStyle),
        getBorderStyle(themeConfig.cardStyle),
        'hover:border-primary/50 hover:shadow-lg hover:bg-card',
        'active:scale-[0.97] active:shadow-sm',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Icon container with themed background */}
      <div className={cn(
        'relative p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-colors',
        iconBackground
      )}>
        <Icon className={cn(
          color,
          'w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10'
        )} strokeWidth={2.5} />

        {/* Badge */}
        {badge && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span className={cn(
        'font-bebas text-[11px] sm:text-sm md:text-base tracking-wider text-center leading-tight line-clamp-2',
        fontWeightClass
      )}>
        {label}
      </span>
    </button>
  );
});

ThemedMenuButton.displayName = 'ThemedMenuButton';

export default ThemedMenuButton;
