import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

// Theme-specific particle colors
const getThemeColors = (theme: SportTheme) => {
  const colors: Record<SportTheme, { primary: string; secondary: string; tertiary: string }> = {
    fire: { primary: 'bg-orange-500', secondary: 'bg-red-500', tertiary: 'bg-yellow-500' },
    ocean: { primary: 'bg-cyan-500', secondary: 'bg-blue-500', tertiary: 'bg-teal-400' },
    forest: { primary: 'bg-emerald-500', secondary: 'bg-green-500', tertiary: 'bg-lime-400' },
    lightning: { primary: 'bg-yellow-400', secondary: 'bg-amber-500', tertiary: 'bg-orange-400' },
    galaxy: { primary: 'bg-purple-500', secondary: 'bg-violet-500', tertiary: 'bg-pink-500' },
    iron: { primary: 'bg-slate-400', secondary: 'bg-zinc-500', tertiary: 'bg-gray-400' },
    blood: { primary: 'bg-red-600', secondary: 'bg-rose-500', tertiary: 'bg-pink-600' },
    neon: { primary: 'bg-pink-500', secondary: 'bg-fuchsia-500', tertiary: 'bg-violet-400' },
    gold: { primary: 'bg-yellow-500', secondary: 'bg-amber-500', tertiary: 'bg-orange-400' },
  };
  return colors[theme];
};

const getOrbColors = (theme: SportTheme) => {
  const orbColors: Record<SportTheme, { orb1: string; orb2: string; orb3: string }> = {
    fire: { orb1: 'bg-orange-500/10', orb2: 'bg-red-500/10', orb3: 'bg-yellow-500/10' },
    ocean: { orb1: 'bg-cyan-500/10', orb2: 'bg-blue-500/10', orb3: 'bg-teal-500/10' },
    forest: { orb1: 'bg-emerald-500/10', orb2: 'bg-green-500/10', orb3: 'bg-lime-500/10' },
    lightning: { orb1: 'bg-yellow-400/10', orb2: 'bg-amber-500/10', orb3: 'bg-orange-400/10' },
    galaxy: { orb1: 'bg-purple-500/10', orb2: 'bg-violet-500/10', orb3: 'bg-pink-500/10' },
    iron: { orb1: 'bg-slate-400/10', orb2: 'bg-zinc-500/10', orb3: 'bg-gray-400/10' },
    blood: { orb1: 'bg-red-600/10', orb2: 'bg-rose-500/10', orb3: 'bg-pink-600/10' },
    neon: { orb1: 'bg-pink-500/10', orb2: 'bg-fuchsia-500/10', orb3: 'bg-violet-400/10' },
    gold: { orb1: 'bg-yellow-500/10', orb2: 'bg-amber-500/10', orb3: 'bg-orange-400/10' },
  };
  return orbColors[theme];
};

const ParticlesBackground: React.FC = () => {
  const { currentTheme } = useTheme();
  const themeColors = getThemeColors(currentTheme);
  const orbColors = getOrbColors(currentTheme);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, []);

  // Get random color class for particles
  const getParticleColor = (index: number) => {
    const colorPool = [themeColors.primary, themeColors.secondary, themeColors.tertiary];
    return colorPool[index % 3];
  };

  return (
    <motion.div 
      key={currentTheme}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${getParticleColor(particle.id)}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, particle.opacity, particle.opacity, 0],
            scale: [0, 1, 1, 0],
            y: [0, -100, -200, -300],
            x: [0, Math.random() * 50 - 25, Math.random() * 100 - 50],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Floating ember particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={`ember-${i}`}
          className={`absolute w-1 h-1 rounded-full ${getParticleColor(i)}`}
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '0%',
            boxShadow: '0 0 6px currentColor',
          }}
          animate={{
            y: [0, -window.innerHeight * (0.5 + Math.random() * 0.5)],
            x: [0, (Math.random() - 0.5) * 200],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.5, 1, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 10,
            delay: Math.random() * 8,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Glowing orbs - Theme colored */}
      <motion.div
        className={`absolute w-32 h-32 rounded-full ${orbColors.orb1} blur-3xl`}
        style={{ left: '10%', top: '20%' }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className={`absolute w-40 h-40 rounded-full ${orbColors.orb2} blur-3xl`}
        style={{ right: '15%', bottom: '30%' }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 6, repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className={`absolute w-24 h-24 rounded-full ${orbColors.orb3} blur-2xl`}
        style={{ left: '50%', top: '60%' }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 2 }}
      />
    </motion.div>
  );
};

export default ParticlesBackground;
