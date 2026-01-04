import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, CardStyle } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  glow?: boolean;
  pattern?: boolean;
}

const getCardStyles = (style: CardStyle): string => {
  switch (style) {
    case 'sharp':
      return 'rounded-sm border-l-4';
    case 'hexagonal':
      return 'rounded-lg clip-hexagon';
    case 'beveled':
      return 'rounded-xl border-2 shadow-xl';
    case 'organic':
      return 'rounded-3xl border';
    case 'rounded':
    default:
      return 'rounded-2xl border';
  }
};

const getPatternOverlay = (pattern: string): React.ReactNode => {
  switch (pattern) {
    case 'dots':
      return (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      );
    case 'lines':
      return (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              hsl(var(--primary) / 0.1) 10px,
              hsl(var(--primary) / 0.1) 20px
            )`
          }}
        />
      );
    case 'grid':
      return (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        />
      );
    case 'waves':
      return (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden"
          style={{
            backgroundImage: `
              repeating-radial-gradient(
                circle at 50% 100%,
                transparent,
                transparent 20px,
                hsl(var(--primary) / 0.05) 20px,
                hsl(var(--primary) / 0.05) 40px
              )
            `
          }}
        />
      );
    case 'circuit':
      return (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px),
              linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
              radial-gradient(circle, hsl(var(--primary) / 0.2) 2px, transparent 2px)
            `,
            backgroundSize: '40px 40px, 40px 40px, 20px 20px',
            backgroundPosition: '0 0, 0 0, 10px 10px'
          }}
        />
      );
    default:
      return null;
  }
};

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  className,
  onClick,
  interactive = false,
  glow = false,
  pattern = false
}) => {
  const { themeConfig } = useTheme();
  
  const cardClasses = cn(
    'relative bg-card/90 backdrop-blur-md border-border/50 overflow-hidden',
    getCardStyles(themeConfig.cardStyle),
    interactive && 'cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]',
    glow && 'shadow-glow',
    className
  );

  const content = (
    <>
      {pattern && getPatternOverlay(themeConfig.pattern)}
      <div className="relative z-10">{children}</div>
    </>
  );

  if (interactive) {
    return (
      <motion.div
        className={cardClasses}
        onClick={onClick}
        whileHover={{ 
          scale: 1.02,
          boxShadow: `0 0 30px hsl(${themeConfig.primary} / var(--theme-glow-intensity))`
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--theme-animation-speed') || '0.3') }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses}>
      {content}
    </div>
  );
};

export default ThemedCard;
