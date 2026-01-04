import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, IconStyle } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ThemedIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  animate?: boolean;
  color?: 'primary' | 'accent' | 'muted' | 'custom';
  customColor?: string;
}

const getIconStyleClasses = (style: IconStyle): string => {
  switch (style) {
    case 'filled':
      return 'fill-current';
    case 'outlined':
      return 'stroke-2';
    case 'duotone':
      return 'opacity-90';
    case 'glow':
      return 'drop-shadow-[0_0_8px_currentColor]';
    default:
      return '';
  }
};

const getAnimationProps = (style: IconStyle) => {
  switch (style) {
    case 'glow':
      return {
        animate: {
          filter: [
            'drop-shadow(0 0 4px currentColor)',
            'drop-shadow(0 0 12px currentColor)',
            'drop-shadow(0 0 4px currentColor)',
          ],
        },
        transition: { duration: 2, repeat: Infinity },
      };
    case 'filled':
      return {
        whileHover: { scale: 1.1, rotate: [0, -5, 5, 0] },
        transition: { duration: 0.3 },
      };
    case 'duotone':
      return {
        whileHover: { scale: 1.05, opacity: 1 },
        transition: { duration: 0.2 },
      };
    default:
      return {
        whileHover: { scale: 1.1 },
        transition: { duration: 0.2 },
      };
  }
};

export const ThemedIcon: React.FC<ThemedIconProps> = ({
  icon: Icon,
  size = 24,
  className,
  animate = true,
  color = 'primary',
  customColor,
}) => {
  const { themeConfig } = useTheme();
  
  const colorClasses = {
    primary: 'text-primary',
    accent: 'text-accent',
    muted: 'text-muted-foreground',
    custom: '',
  };

  const iconClasses = cn(
    colorClasses[color],
    getIconStyleClasses(themeConfig.icons.style),
    className
  );

  const animationProps = animate ? getAnimationProps(themeConfig.icons.style) : {};

  return (
    <motion.span
      className="inline-flex items-center justify-center"
      style={{ color: customColor }}
      {...animationProps}
    >
      <Icon size={size} className={iconClasses} />
    </motion.span>
  );
};

// Theme-aware icon that uses the theme's main/secondary/accent icons
export const ThemeIcon: React.FC<{
  type: 'main' | 'secondary' | 'accent';
  size?: number;
  className?: string;
  animate?: boolean;
}> = ({ type, size = 24, className, animate = true }) => {
  const { themeConfig } = useTheme();
  
  const iconMap = {
    main: themeConfig.icons.main,
    secondary: themeConfig.icons.secondary,
    accent: themeConfig.icons.accent,
  };

  return (
    <ThemedIcon
      icon={iconMap[type]}
      size={size}
      className={className}
      animate={animate}
      color="primary"
    />
  );
};

export default ThemedIcon;
