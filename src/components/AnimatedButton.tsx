import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface AnimatedButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  size = 'md',
  disabled = false,
}) => {
  const { playClickSound } = useAudio();

  const handleClick = () => {
    if (!disabled) {
      playClickSound();
      onClick();
    }
  };

  const sizeClasses = {
    sm: 'w-32 h-32 text-sm',
    md: 'w-40 h-40 text-base',
    lg: 'w-48 h-48 text-lg',
  };

  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const colorClasses = {
    primary: 'from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60 shadow-primary/50',
    secondary: 'from-secondary to-secondary/70 hover:from-secondary/90 hover:to-secondary/60 shadow-secondary/50',
    accent: 'from-accent to-accent/70 hover:from-accent/90 hover:to-accent/60 shadow-accent/50',
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -5 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative ${sizeClasses[size]} rounded-2xl
        bg-gradient-to-br ${colorClasses[color]}
        flex flex-col items-center justify-center gap-3
        border-2 border-white/10
        shadow-lg transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        group overflow-hidden
      `}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        initial={false}
      />

      {/* Pulse ring animation */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-white/30"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Icon */}
      <motion.div
        animate={{
          y: [0, -3, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon size={iconSizes[size]} className="text-white drop-shadow-lg" />
      </motion.div>

      {/* Label */}
      <span className="font-bebas text-white tracking-wider drop-shadow-lg z-10">
        {label}
      </span>

      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/30 rounded-tl" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/30 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/30 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/30 rounded-br" />
    </motion.button>
  );
};

export default AnimatedButton;
