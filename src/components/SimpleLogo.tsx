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
    lg: 'w-36 h-auto sm:w-44 md:w-52 lg:w-60',
    xl: 'w-44 h-auto sm:w-52 md:w-60 lg:w-72',
  };

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.9 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Simple glow effect using CSS */}
      {showGlow && (
        <div 
          className="absolute inset-0 blur-xl opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)',
            transform: 'scale(1.5)',
          }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className={`${sizeClasses[size]} aspect-square bg-muted/30 rounded-lg animate-pulse`} />
      )}
      
      <img
        src={logomarca}
        alt="Franc's Gym Pro"
        className={`${sizeClasses[size]} object-contain relative z-10 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        onLoad={() => setIsLoaded(true)}
        loading="eager"
      />
    </motion.div>
  );
};

export default SimpleLogo;