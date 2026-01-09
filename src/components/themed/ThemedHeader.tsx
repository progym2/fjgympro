import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/lib/themeStyles';

interface ThemedHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ThemedHeader: React.FC<ThemedHeaderProps> = ({ children, className }) => {
  const { themeConfig } = useTheme();
  const themeStyles = useThemeStyles();

  const getHeaderStyle = () => {
    switch (themeConfig.cardStyle) {
      case 'sharp':
        return 'rounded-none border-b-4';
      case 'beveled':
        return 'rounded-none border-b-2';
      default:
        return 'rounded-none';
    }
  };

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-40 pt-safe w-full',
        themeStyles.cardBg,
        'backdrop-blur-md',
        'border-b',
        themeStyles.cardBorder,
        'shadow-md',
        getHeaderStyle(),
        className
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated border glow for high/extreme glow themes */}
      {(themeConfig.glowIntensity === 'high' || themeConfig.glowIntensity === 'extreme') && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(${themeConfig.primary}) 20%, 
              hsl(${themeConfig.accent}) 50%, 
              hsl(${themeConfig.primary}) 80%, 
              transparent 100%
            )`
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Pattern overlay */}
      {themeConfig.pattern !== 'none' && (
        <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
          {themeConfig.pattern === 'circuit' && (
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px),
                linear-gradient(hsl(var(--primary)) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }} />
          )}
        </div>
      )}

      <div className="relative z-10">
        {children}
      </div>
    </motion.header>
  );
};

export default ThemedHeader;
