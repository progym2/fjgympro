import React, { useMemo } from 'react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';

// Minimal CSS-only particles - very lightweight
const getThemeColor = (theme: SportTheme): string => {
  const colors: Record<SportTheme, string> = {
    fire: 'bg-orange-500/30',
    ocean: 'bg-cyan-500/30',
    forest: 'bg-emerald-500/30',
    lightning: 'bg-yellow-400/30',
    galaxy: 'bg-purple-500/30',
    iron: 'bg-slate-400/30',
    blood: 'bg-red-600/30',
    neon: 'bg-pink-500/30',
    gold: 'bg-yellow-500/30',
    amoled: 'bg-gray-600/20',
  };
  return colors[theme];
};

const SimpleParticles: React.FC = () => {
  const { currentTheme } = useTheme();
  const color = getThemeColor(currentTheme);

  // Generate static positions - no animation overhead
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${10 + (i % 4) * 25 + Math.random() * 10}%`,
      top: `${15 + Math.floor(i / 4) * 30 + Math.random() * 10}%`,
      size: 2 + (i % 3),
      animationDelay: `${i * 0.5}s`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 80%, hsl(var(--primary) / 0.1) 0%, transparent 50%)`
        }}
      />
      
      {/* Simple floating dots with CSS animation */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${color} animate-pulse`}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.animationDelay,
            animationDuration: '3s',
          }}
        />
      ))}
    </div>
  );
};

export default SimpleParticles;