import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  opacity: number;
}

interface FireParticlesProps {
  count?: number;
  className?: string;
}

const FireParticles: React.FC<FireParticlesProps> = ({ count = 25, className = '' }) => {
  const particles = useMemo(() => {
    const colors = [
      'bg-orange-500',
      'bg-amber-500', 
      'bg-red-500',
      'bg-yellow-500',
      'bg-orange-400',
      'bg-red-400',
    ];
    
    return Array.from({ length: count }, (_, i): Particle => ({
      id: i,
      x: Math.random() * 100,
      y: 80 + Math.random() * 30, // Start from bottom area
      size: 2 + Math.random() * 6,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${particle.color} blur-[1px]`}
          style={{
            left: `${particle.x}%`,
            bottom: `${100 - particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{ 
            opacity: 0, 
            y: 0,
            scale: 1,
          }}
          animate={{ 
            opacity: [0, particle.opacity, particle.opacity * 0.8, 0],
            y: [0, -150, -300, -450],
            x: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60],
            scale: [1, 1.2, 0.8, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
      
      {/* Glowing ember effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-600/10 via-red-500/5 to-transparent" />
      
      {/* Subtle flickering glow */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-orange-500/8 via-transparent to-transparent"
        animate={{ 
          opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export default FireParticles;
