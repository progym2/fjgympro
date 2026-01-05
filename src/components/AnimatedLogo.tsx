import React, { useState, useMemo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import logomarca from '@/assets/logomarca.png';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

const AnimatedLogo = forwardRef<HTMLDivElement, AnimatedLogoProps>(({ 
  size = 'md', 
  className = '',
  showGlow = true 
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { themeConfig, currentTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-auto sm:w-10',
    md: 'w-10 h-auto sm:w-12',
    lg: 'w-32 h-auto sm:w-36 md:w-40',
    xl: 'w-36 h-auto sm:w-44 md:w-48',
  };

  // Memoize theme animation to prevent recalculation on every render
  const themeAnimation = useMemo(() => {
    switch (currentTheme) {
      case 'fire':
        return {
          filter: showGlow ? [
            'drop-shadow(0 0 8px hsl(24 100% 50%/0.4)) brightness(1)',
            'drop-shadow(0 0 20px hsl(24 100% 50%/0.7)) brightness(1.1)',
            'drop-shadow(0 0 8px hsl(24 100% 50%/0.4)) brightness(1)',
          ] : 'none',
        };
      case 'ocean':
        return {
          y: [0, -3, 0, 3, 0],
          filter: showGlow ? [
            'drop-shadow(0 0 10px hsl(200 100% 50%/0.4))',
            'drop-shadow(0 0 15px hsl(200 100% 50%/0.6))',
            'drop-shadow(0 0 10px hsl(200 100% 50%/0.4))',
          ] : 'none',
        };
      case 'forest':
        return {
          scale: [1, 1.02, 1],
          filter: showGlow ? [
            'drop-shadow(0 0 8px hsl(142 76% 36%/0.3))',
            'drop-shadow(0 0 12px hsl(142 76% 36%/0.5))',
            'drop-shadow(0 0 8px hsl(142 76% 36%/0.3))',
          ] : 'none',
        };
      case 'lightning':
        return {
          filter: showGlow ? [
            'drop-shadow(0 0 5px hsl(48 100% 50%/0.5)) brightness(1)',
            'drop-shadow(0 0 25px hsl(48 100% 50%/0.9)) brightness(1.2)',
            'drop-shadow(0 0 5px hsl(48 100% 50%/0.5)) brightness(1)',
            'drop-shadow(0 0 30px hsl(48 100% 50%/1)) brightness(1.3)',
            'drop-shadow(0 0 5px hsl(48 100% 50%/0.5)) brightness(1)',
          ] : 'none',
        };
      case 'galaxy':
        return {
          rotate: [0, 2, -2, 0],
          filter: showGlow ? [
            'drop-shadow(0 0 10px hsl(270 100% 60%/0.4)) hue-rotate(0deg)',
            'drop-shadow(0 0 20px hsl(270 100% 60%/0.7)) hue-rotate(10deg)',
            'drop-shadow(0 0 10px hsl(270 100% 60%/0.4)) hue-rotate(-10deg)',
            'drop-shadow(0 0 15px hsl(270 100% 60%/0.5)) hue-rotate(0deg)',
          ] : 'none',
        };
      case 'iron':
        return {
          filter: showGlow ? [
            'drop-shadow(0 0 5px hsl(220 10% 50%/0.3)) contrast(1)',
            'drop-shadow(0 0 10px hsl(220 10% 50%/0.5)) contrast(1.05)',
            'drop-shadow(0 0 5px hsl(220 10% 50%/0.3)) contrast(1)',
          ] : 'none',
        };
      case 'blood':
        return {
          scale: [1, 1.03, 1, 1.02, 1],
          filter: showGlow ? [
            'drop-shadow(0 0 8px hsl(0 84% 40%/0.5))',
            'drop-shadow(0 0 15px hsl(0 84% 40%/0.8))',
            'drop-shadow(0 0 8px hsl(0 84% 40%/0.5))',
          ] : 'none',
        };
      case 'neon':
        return {
          filter: showGlow ? [
            'drop-shadow(0 0 10px hsl(320 100% 60%/0.6)) drop-shadow(0 0 20px hsl(320 100% 60%/0.3))',
            'drop-shadow(0 0 20px hsl(320 100% 60%/0.9)) drop-shadow(0 0 40px hsl(320 100% 60%/0.5))',
            'drop-shadow(0 0 10px hsl(320 100% 60%/0.6)) drop-shadow(0 0 20px hsl(320 100% 60%/0.3))',
          ] : 'none',
        };
      case 'gold':
        return {
          filter: showGlow ? [
            'drop-shadow(0 0 8px hsl(45 100% 45%/0.4)) saturate(1)',
            'drop-shadow(0 0 15px hsl(45 100% 45%/0.7)) saturate(1.2)',
            'drop-shadow(0 0 8px hsl(45 100% 45%/0.4)) saturate(1)',
          ] : 'none',
        };
      default:
        return {
          filter: showGlow ? [
            'drop-shadow(0 0 10px hsl(var(--primary)/0.3))',
            'drop-shadow(0 0 20px hsl(var(--primary)/0.5))',
            'drop-shadow(0 0 10px hsl(var(--primary)/0.3))',
          ] : 'none',
        };
    }
  }, [currentTheme, showGlow]);

  return (
    <motion.div
      ref={ref}
      key={currentTheme}
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isLoaded ? 1 : 0, 
        scale: isLoaded ? 1 : 0.8,
        ...themeAnimation,
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        opacity: { duration: 0.3, repeat: 0 },
        scale: { duration: 0.3, repeat: 0 },
      }}
    >
      {/* Theme-specific decorative elements */}
      {showGlow && currentTheme === 'lightning' && (
        <motion.div
          className="absolute -inset-2 pointer-events-none"
          animate={{ 
            opacity: [0, 0.8, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <div className="w-full h-full rounded-full bg-yellow-400/30 blur-xl" />
        </motion.div>
      )}

      {showGlow && currentTheme === 'neon' && (
        <>
          <motion.div
            className="absolute -inset-3 pointer-events-none rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(320 100% 60%/0.2), transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute -inset-1 pointer-events-none rounded-full border-2 border-pink-500/30"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </>
      )}

      {showGlow && currentTheme === 'galaxy' && (
        <motion.div
          className="absolute -inset-4 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 120}deg) translateX(${20 + i * 5}px)`,
              }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </motion.div>
      )}

      {showGlow && currentTheme === 'fire' && (
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 pointer-events-none"
          animate={{ 
            scaleY: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <div className="w-8 h-4 bg-gradient-to-t from-orange-500/50 to-transparent rounded-full blur-sm" />
        </motion.div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className={`${sizeClasses[size]} aspect-square bg-muted/30 rounded-lg animate-pulse`} />
      )}
      
      <img
        src={logomarca}
        alt="Franc's Gym Pro"
        className={`${sizeClasses[size]} object-contain ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        onLoad={() => setIsLoaded(true)}
      />
    </motion.div>
  );
});

AnimatedLogo.displayName = 'AnimatedLogo';

export default AnimatedLogo;
