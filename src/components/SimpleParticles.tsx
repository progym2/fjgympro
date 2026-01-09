import React, { useMemo, memo } from 'react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';

// Cores por tema
const getThemeColors = (theme: SportTheme): { primary: string; secondary: string } => {
  const colors: Record<SportTheme, { primary: string; secondary: string }> = {
    fire: { primary: 'rgba(251,146,60,0.4)', secondary: 'rgba(239,68,68,0.3)' },
    ocean: { primary: 'rgba(34,211,238,0.4)', secondary: 'rgba(59,130,246,0.3)' },
    forest: { primary: 'rgba(52,211,153,0.4)', secondary: 'rgba(34,197,94,0.3)' },
    lightning: { primary: 'rgba(251,191,36,0.4)', secondary: 'rgba(245,158,11,0.3)' },
    galaxy: { primary: 'rgba(192,132,252,0.4)', secondary: 'rgba(168,85,247,0.3)' },
    iron: { primary: 'rgba(148,163,184,0.3)', secondary: 'rgba(100,116,139,0.25)' },
    blood: { primary: 'rgba(239,68,68,0.4)', secondary: 'rgba(220,38,38,0.3)' },
    neon: { primary: 'rgba(236,72,153,0.5)', secondary: 'rgba(168,85,247,0.4)' },
    gold: { primary: 'rgba(234,179,8,0.4)', secondary: 'rgba(245,158,11,0.3)' },
    amoled: { primary: 'rgba(107,114,128,0.25)', secondary: 'rgba(75,85,99,0.2)' },
  };
  return colors[theme];
};

// Tipos de partículas fitness
type FitnessParticleType = 'dumbbell' | 'kettlebell' | 'plate' | 'barbell' | 'heart' | 'star';

const PARTICLE_COUNT = 12;

// Componente SVG de Haltere
const DumbbellSVG: React.FC<{ color: string; size: number }> = memo(({ color, size }) => (
  <svg width={size * 2} height={size} viewBox="0 0 40 20" fill="none">
    <rect x="2" y="4" width="8" height="12" rx="2" fill={color} />
    <rect x="10" y="7" width="20" height="6" rx="2" fill={color} opacity="0.7" />
    <rect x="30" y="4" width="8" height="12" rx="2" fill={color} />
  </svg>
));

DumbbellSVG.displayName = 'DumbbellSVG';

// Componente SVG de Kettlebell
const KettlebellSVG: React.FC<{ color: string; size: number }> = memo(({ color, size }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 24 30" fill="none">
    <path 
      d="M12 2 C7 2 5 6 5 8 L5 10 C5 10 2 14 2 20 C2 26 7 28 12 28 C17 28 22 26 22 20 C22 14 19 10 19 10 L19 8 C19 6 17 2 12 2 Z"
      fill={color}
    />
    <ellipse cx="12" cy="5" rx="4" ry="2" fill="rgba(0,0,0,0.2)" />
  </svg>
));

KettlebellSVG.displayName = 'KettlebellSVG';

// Componente SVG de Placa de Peso
const WeightPlateSVG: React.FC<{ color: string; size: number }> = memo(({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill={color} />
    <circle cx="12" cy="12" r="8" fill="rgba(0,0,0,0.15)" />
    <circle cx="12" cy="12" r="3" fill="rgba(0,0,0,0.25)" />
  </svg>
));

WeightPlateSVG.displayName = 'WeightPlateSVG';

// Componente SVG de Barra
const BarbellSVG: React.FC<{ color: string; size: number }> = memo(({ color, size }) => (
  <svg width={size * 2.5} height={size * 0.6} viewBox="0 0 50 12" fill="none">
    <rect x="2" y="1" width="6" height="10" rx="1" fill={color} />
    <rect x="8" y="3" width="4" height="6" rx="1" fill={color} opacity="0.7" />
    <rect x="12" y="5" width="26" height="2" rx="1" fill={color} opacity="0.5" />
    <rect x="38" y="3" width="4" height="6" rx="1" fill={color} opacity="0.7" />
    <rect x="42" y="1" width="6" height="10" rx="1" fill={color} />
  </svg>
));

BarbellSVG.displayName = 'BarbellSVG';

// Componente SVG de Coração (cardio)
const HeartSVG: React.FC<{ color: string; size: number }> = memo(({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
));

HeartSVG.displayName = 'HeartSVG';

// Componente SVG de Estrela
const StarSVG: React.FC<{ color: string; size: number }> = memo(({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
));

StarSVG.displayName = 'StarSVG';

// Renderizar partícula baseado no tipo
const FitnessParticle: React.FC<{ type: FitnessParticleType; color: string; size: number }> = memo(({ type, color, size }) => {
  switch (type) {
    case 'dumbbell':
      return <DumbbellSVG color={color} size={size} />;
    case 'kettlebell':
      return <KettlebellSVG color={color} size={size} />;
    case 'plate':
      return <WeightPlateSVG color={color} size={size} />;
    case 'barbell':
      return <BarbellSVG color={color} size={size} />;
    case 'heart':
      return <HeartSVG color={color} size={size} />;
    case 'star':
      return <StarSVG color={color} size={size} />;
    default:
      return <WeightPlateSVG color={color} size={size} />;
  }
});

FitnessParticle.displayName = 'FitnessParticle';

const SimpleParticles: React.FC = memo(() => {
  const { currentTheme } = useTheme();
  const colors = getThemeColors(currentTheme);

  // Gerar partículas com tipos variados
  const particles = useMemo(() => {
    const types: FitnessParticleType[] = ['dumbbell', 'kettlebell', 'plate', 'barbell', 'heart', 'star'];
    
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const type = types[i % types.length];
      const isSecondary = i % 2 === 0;
      
      return {
        id: i,
        type,
        left: `${5 + Math.random() * 90}%`,
        top: `${5 + Math.random() * 90}%`,
        size: 10 + Math.random() * 8,
        color: isSecondary ? colors.secondary : colors.primary,
        duration: 15 + Math.random() * 10,
        delay: i * 0.8,
        rotation: Math.random() * 360,
        floatDistance: 20 + Math.random() * 30,
      };
    });
  }, [colors]);

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
      
      {/* Floating fitness particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            top: p.top,
            opacity: 0.6,
          }}
        >
          <div
            style={{
              transform: `rotate(${p.rotation}deg)`,
              animationName: `floatFitness${p.id % 4}`,
              animationDuration: `${p.duration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${p.delay}s`,
            }}
          >
            <FitnessParticle type={p.type} color={p.color} size={p.size} />
          </div>
        </div>
      ))}

      {/* CSS Animations for floating effect */}
      <style>{`
        @keyframes floatFitness0 {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
          25% { transform: translateY(-20px) rotate(5deg); opacity: 0.7; }
          50% { transform: translateY(-10px) rotate(-3deg); opacity: 0.5; }
          75% { transform: translateY(-25px) rotate(8deg); opacity: 0.6; }
        }
        @keyframes floatFitness1 {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.5; }
          33% { transform: translateY(-15px) translateX(10px) rotate(-5deg); opacity: 0.7; }
          66% { transform: translateY(-25px) translateX(-5px) rotate(5deg); opacity: 0.4; }
        }
        @keyframes floatFitness2 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.1); opacity: 0.8; }
        }
        @keyframes floatFitness3 {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
          20% { transform: translateY(-10px) rotate(-10deg); opacity: 0.6; }
          40% { transform: translateY(-20px) rotate(5deg); opacity: 0.8; }
          60% { transform: translateY(-15px) rotate(-5deg); opacity: 0.6; }
          80% { transform: translateY(-5px) rotate(10deg); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
});

SimpleParticles.displayName = 'SimpleParticles';

export default SimpleParticles;
