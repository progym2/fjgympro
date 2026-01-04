import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Heart, Zap, Target, Flame, Trophy } from 'lucide-react';

const FitnessAnimation: React.FC = () => {
  const icons = [
    { Icon: Dumbbell, delay: 0, color: 'text-primary' },
    { Icon: Heart, delay: 0.2, color: 'text-red-500' },
    { Icon: Zap, delay: 0.4, color: 'text-yellow-500' },
    { Icon: Target, delay: 0.6, color: 'text-green-500' },
    { Icon: Flame, delay: 0.8, color: 'text-orange-500' },
    { Icon: Trophy, delay: 1, color: 'text-amber-500' },
  ];

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      {/* Central Pulsing Circle */}
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orbiting Icons */}
      <div className="relative w-48 h-48">
        {icons.map(({ Icon, delay, color }, index) => {
          const angle = (index / icons.length) * Math.PI * 2;
          const radius = 80;
          
          return (
            <motion.div
              key={index}
              className={`absolute ${color}`}
              style={{
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [
                  Math.cos(angle) * radius - 16,
                  Math.cos(angle + Math.PI) * radius - 16,
                  Math.cos(angle) * radius - 16,
                ],
                y: [
                  Math.sin(angle) * radius - 16,
                  Math.sin(angle + Math.PI) * radius - 16,
                  Math.sin(angle) * radius - 16,
                ],
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 8,
                delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <motion.div
                animate={{
                  filter: ['drop-shadow(0 0 8px currentColor)', 'drop-shadow(0 0 16px currentColor)', 'drop-shadow(0 0 8px currentColor)'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Icon size={32} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* Center Logo Effect */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Dumbbell size={48} className="text-primary" />
        </motion.div>
      </div>

      {/* Floating Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 bg-primary/60 rounded-full"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, Math.random() * 10 - 5, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: i * 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default FitnessAnimation;
