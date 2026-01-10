import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { Dumbbell, Heart, Flame, Zap, Activity, Target, Trophy, Sparkles } from 'lucide-react';

interface FitnessLoadingScreenProps {
  message?: string;
}

// Animated dumbbell SVG
const AnimatedDumbbell = memo(({ color }: { color: string }) => (
  <motion.svg
    viewBox="0 0 120 40"
    className="w-32 h-12"
    initial={{ rotateY: 0 }}
    animate={{ rotateY: [0, 180, 360] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
  >
    <motion.rect 
      x="5" y="10" width="15" height="20" rx="2" 
      fill={color}
      animate={{ scaleY: [1, 0.8, 1] }}
      transition={{ duration: 0.5, repeat: Infinity }}
    />
    <motion.rect 
      x="20" y="15" width="8" height="10" rx="1" 
      fill={color} opacity="0.7"
    />
    <motion.rect 
      x="28" y="18" width="64" height="4" rx="2" 
      fill={color} opacity="0.5"
    />
    <motion.rect 
      x="92" y="15" width="8" height="10" rx="1" 
      fill={color} opacity="0.7"
    />
    <motion.rect 
      x="100" y="10" width="15" height="20" rx="2" 
      fill={color}
      animate={{ scaleY: [1, 0.8, 1] }}
      transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
    />
  </motion.svg>
));

AnimatedDumbbell.displayName = 'AnimatedDumbbell';

// Kettlebell swing animation
const SwingingKettlebell = memo(({ color }: { color: string }) => (
  <motion.svg
    viewBox="0 0 50 60"
    className="w-16 h-20"
    animate={{ rotate: [-15, 15, -15] }}
    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    style={{ transformOrigin: 'center 10%' }}
  >
    <motion.path
      d="M25 8 C15 8 12 14 12 14 L12 18 C12 18 5 26 5 38 C5 50 15 55 25 55 C35 55 45 50 45 38 C45 26 38 18 38 18 L38 14 C38 14 35 8 25 8 Z"
      fill={color}
    />
    <motion.ellipse
      cx="25" cy="12" rx="5" ry="3"
      fill="black" opacity="0.3"
    />
    <motion.circle
      cx="25" cy="38"
      r="4"
      fill="white"
      opacity="0.2"
      animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  </motion.svg>
));

SwingingKettlebell.displayName = 'SwingingKettlebell';

// Pulsing heart rate
const PulsingHeart = memo(({ color }: { color: string }) => (
  <motion.div className="relative">
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <Heart className="w-10 h-10" fill={color} color={color} />
    </motion.div>
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <Heart className="w-14 h-14 opacity-30" fill={color} color={color} />
    </motion.div>
  </motion.div>
));

PulsingHeart.displayName = 'PulsingHeart';

// Running dots (like a progress indicator)
const RunningDots = memo(({ color }: { color: string }) => (
  <div className="flex gap-2">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ 
          y: [0, -15, 0],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{ 
          duration: 0.6, 
          repeat: Infinity, 
          delay: i * 0.1,
          ease: 'easeInOut'
        }}
      />
    ))}
  </div>
));

RunningDots.displayName = 'RunningDots';

// Weight plate spinning
const SpinningPlate = memo(({ color }: { color: string }) => (
  <motion.svg
    viewBox="0 0 60 60"
    className="w-16 h-16"
    animate={{ rotate: 360 }}
    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
  >
    <circle cx="30" cy="30" r="28" fill={color} opacity="0.8" />
    <circle cx="30" cy="30" r="22" fill="black" opacity="0.3" />
    <circle cx="30" cy="30" r="6" fill="black" opacity="0.5" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <motion.circle
        key={i}
        cx={30 + 15 * Math.cos((angle * Math.PI) / 180)}
        cy={30 + 15 * Math.sin((angle * Math.PI) / 180)}
        r="2"
        fill="white"
        opacity="0.5"
      />
    ))}
  </motion.svg>
));

SpinningPlate.displayName = 'SpinningPlate';

// Jumping rope animation
const JumpingRope = memo(({ color }: { color: string }) => (
  <div className="relative w-20 h-16 flex items-end justify-center">
    <motion.div
      className="absolute bottom-0 w-full"
      style={{ 
        borderBottom: `3px solid ${color}`,
        borderRadius: '50%',
        height: '40px'
      }}
      animate={{ 
        scaleY: [0.3, 1, 0.3],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{ duration: 0.4, repeat: Infinity }}
    />
    <motion.div
      className="w-3 h-6 bg-current rounded-full mb-2"
      style={{ color }}
      animate={{ y: [0, -20, 0] }}
      transition={{ duration: 0.4, repeat: Infinity }}
    />
  </div>
));

JumpingRope.displayName = 'JumpingRope';

// Energy burst
const EnergyBurst = memo(({ color }: { color: string }) => (
  <div className="relative">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      <Zap className="w-12 h-12" fill={color} color={color} />
    </motion.div>
    {[0, 60, 120, 180, 240, 300].map((angle, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{ 
          backgroundColor: color,
          top: '50%',
          left: '50%',
          transformOrigin: 'center'
        }}
        animate={{
          x: [0, 30 * Math.cos((angle * Math.PI) / 180)],
          y: [0, 30 * Math.sin((angle * Math.PI) / 180)],
          opacity: [1, 0],
          scale: [0.5, 1.5]
        }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          delay: i * 0.15 
        }}
      />
    ))}
  </div>
));

EnergyBurst.displayName = 'EnergyBurst';

const getThemeConfig = (theme: SportTheme) => {
  const configs: Record<SportTheme, { 
    color: string; 
    bgGradient: string; 
    animation: 'dumbbell' | 'kettlebell' | 'heart' | 'dots' | 'plate' | 'rope' | 'energy';
    icon: React.ElementType;
  }> = {
    fire: { 
      color: '#ff6b35', 
      bgGradient: 'from-orange-950/90 via-red-950/80 to-black/90',
      animation: 'energy',
      icon: Flame
    },
    ocean: { 
      color: '#22d3ee', 
      bgGradient: 'from-cyan-950/90 via-blue-950/80 to-black/90',
      animation: 'dots',
      icon: Activity
    },
    forest: { 
      color: '#34d399', 
      bgGradient: 'from-emerald-950/90 via-green-950/80 to-black/90',
      animation: 'heart',
      icon: Heart
    },
    lightning: { 
      color: '#fbbf24', 
      bgGradient: 'from-yellow-950/90 via-amber-950/80 to-black/90',
      animation: 'energy',
      icon: Zap
    },
    galaxy: { 
      color: '#c084fc', 
      bgGradient: 'from-purple-950/90 via-violet-950/80 to-black/90',
      animation: 'plate',
      icon: Sparkles
    },
    iron: { 
      color: '#94a3b8', 
      bgGradient: 'from-slate-900/90 via-zinc-950/80 to-black/90',
      animation: 'dumbbell',
      icon: Dumbbell
    },
    blood: { 
      color: '#ef4444', 
      bgGradient: 'from-red-950/90 via-rose-950/80 to-black/90',
      animation: 'heart',
      icon: Heart
    },
    neon: { 
      color: '#ec4899', 
      bgGradient: 'from-pink-950/90 via-fuchsia-950/80 to-black/90',
      animation: 'dots',
      icon: Activity
    },
    gold: { 
      color: '#eab308', 
      bgGradient: 'from-yellow-950/90 via-amber-950/80 to-black/90',
      animation: 'kettlebell',
      icon: Trophy
    },
    amoled: { 
      color: '#6b7280', 
      bgGradient: 'from-zinc-950/95 via-black/90 to-black/95',
      animation: 'plate',
      icon: Target
    },
  };
  return configs[theme] || configs.fire;
};

const FitnessLoadingScreen: React.FC<FitnessLoadingScreenProps> = memo(({ 
  message = 'Carregando...' 
}) => {
  const { currentTheme } = useTheme();
  const config = useMemo(() => getThemeConfig(currentTheme), [currentTheme]);

  const AnimationComponent = useMemo(() => {
    switch (config.animation) {
      case 'dumbbell': return <AnimatedDumbbell color={config.color} />;
      case 'kettlebell': return <SwingingKettlebell color={config.color} />;
      case 'heart': return <PulsingHeart color={config.color} />;
      case 'dots': return <RunningDots color={config.color} />;
      case 'plate': return <SpinningPlate color={config.color} />;
      case 'rope': return <JumpingRope color={config.color} />;
      case 'energy': return <EnergyBurst color={config.color} />;
      default: return <AnimatedDumbbell color={config.color} />;
    }
  }, [config.animation, config.color]);

  const ThemeIcon = config.icon;

  return (
    <motion.div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br ${config.bgGradient}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${config.color} 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Main animation container */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Theme icon at top */}
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ThemeIcon 
            className="w-8 h-8"
            style={{ color: config.color }}
          />
        </motion.div>

        {/* Main fitness animation */}
        <div className="relative">
          {AnimationComponent}
          
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 blur-2xl opacity-30"
            style={{ backgroundColor: config.color }}
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <span 
            className="font-bebas text-lg tracking-[0.2em] uppercase"
            style={{ color: config.color }}
          >
            {message}
          </span>
          
          {/* Progress bar - faster */}
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ 
            backgroundColor: config.color,
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </motion.div>
  );
});

FitnessLoadingScreen.displayName = 'FitnessLoadingScreen';

export default FitnessLoadingScreen;
