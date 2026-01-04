import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ThemedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  glow?: boolean;
}

const getButtonShape = (shape: string): string => {
  switch (shape) {
    case 'pill':
      return 'rounded-full';
    case 'sharp':
      return 'rounded-none';
    case 'hexagon':
      return 'rounded-lg [clip-path:polygon(5%_0%,95%_0%,100%_50%,95%_100%,5%_100%,0%_50%)]';
    case 'rounded':
    default:
      return 'rounded-xl';
  }
};

const getSizeClasses = (size: string): string => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm gap-1.5';
    case 'lg':
      return 'px-8 py-4 text-lg gap-3';
    case 'xl':
      return 'px-10 py-5 text-xl gap-4';
    case 'md':
    default:
      return 'px-6 py-3 text-base gap-2';
  }
};

const getVariantClasses = (variant: string): string => {
  switch (variant) {
    case 'secondary':
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
    case 'ghost':
      return 'bg-transparent hover:bg-secondary/50 text-foreground';
    case 'outline':
      return 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground';
    case 'primary':
    default:
      return 'bg-gradient-primary text-primary-foreground';
  }
};

const getIconSize = (size: string): number => {
  switch (size) {
    case 'sm': return 14;
    case 'lg': return 22;
    case 'xl': return 26;
    default: return 18;
  }
};

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  children,
  onClick,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  fullWidth = false,
  glow = true
}) => {
  const { themeConfig } = useTheme();
  
  const fontWeightClass = themeConfig.fontWeight === 'extra-bold' 
    ? 'font-black' 
    : themeConfig.fontWeight === 'bold' 
      ? 'font-bold' 
      : 'font-medium';

  const buttonClasses = cn(
    'relative inline-flex items-center justify-center transition-all duration-300',
    'font-bebas tracking-wider uppercase',
    fontWeightClass,
    getButtonShape(themeConfig.buttonShape),
    getSizeClasses(size),
    getVariantClasses(variant),
    glow && variant === 'primary' && 'shadow-button hover:shadow-glow',
    fullWidth && 'w-full',
    disabled && 'opacity-50 pointer-events-none',
    className
  );

  return (
    <motion.button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ 
        scale: disabled ? 1 : 1.05,
        boxShadow: glow && variant === 'primary' 
          ? `0 0 40px hsl(${themeConfig.primary} / 0.5)` 
          : undefined
      }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ 
        duration: 0.2,
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
    >
      {/* Shimmer effect for primary buttons */}
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-100"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        />
      )}
      
      {Icon && (
        <motion.span
          initial={{ rotate: 0 }}
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.3 }}
        >
          <Icon size={getIconSize(size)} />
        </motion.span>
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

export default ThemedButton;
