import React, { useState } from 'react';
import { motion } from 'framer-motion';
import logomarca from '@/assets/logomarca.png';

interface SimpleLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

const SimpleLogo: React.FC<SimpleLogoProps> = ({ 
  size = 'md', 
  className = '',
  showGlow = true 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-auto sm:w-10',
    md: 'w-10 h-auto sm:w-12',
    lg: 'w-24 h-auto sm:w-28 md:w-32 lg:w-36',
    xl: 'w-32 h-auto sm:w-36 md:w-44 lg:w-52',
  };

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.8, y: -30 }}
      animate={{ 
        opacity: isLoaded ? 1 : 0, 
        scale: isLoaded ? 1 : 0.8,
        y: isLoaded ? 0 : -30
      }}
      transition={{ 
        duration: 0.8, 
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.1
      }}
    >
      {/* Animated glow effect */}
      {showGlow && (
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1.3, 1.5, 1.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 60%)',
            filter: 'blur(20px)',
          }}
        />
      )}

      {/* Secondary shimmer effect */}
      {showGlow && (
        <motion.div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transform: 'skewX(-20deg)',
            }}
            animate={{
              x: ['-200%', '200%'],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut'
            }}
          />
        </motion.div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className={`${sizeClasses[size]} aspect-square bg-muted/30 rounded-lg animate-pulse`} />
      )}
      
      <motion.img
        src={logomarca}
        alt="Franc's Gym Pro"
        className={`${sizeClasses[size]} object-contain relative z-10 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        onLoad={() => setIsLoaded(true)}
        loading="eager"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
};

export default SimpleLogo;