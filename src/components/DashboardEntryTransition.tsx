import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Dumbbell, Shield, CheckCircle2 } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

interface DashboardEntryTransitionProps {
  panelType: 'client' | 'instructor' | 'admin';
  userName?: string;
  onComplete: () => void;
}

const panelConfig = {
  client: {
    label: 'CLIENTE',
    icon: User,
    color: 'text-primary',
    bgGradient: 'from-primary/20 via-primary/10 to-transparent',
  },
  instructor: {
    label: 'INSTRUTOR',
    icon: Dumbbell,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 via-green-500/10 to-transparent',
  },
  admin: {
    label: 'GERENTE',
    icon: Shield,
    color: 'text-blue-500',
    bgGradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
  },
} as const;

const DashboardEntryTransition: React.FC<DashboardEntryTransitionProps> = ({
  panelType,
  userName,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Timings reduced for faster entry - total ~800ms instead of 1750ms
    const showTimer = window.setTimeout(() => setPhase('show'), 100);
    const exitTimer = window.setTimeout(() => setPhase('exit'), 550);
    const completeTimer = window.setTimeout(() => onCompleteRef.current(), 750);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, []);

  const config = panelConfig[panelType];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={
        phase === 'exit'
          ? { opacity: 0, scale: 1.04 }
          : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
    >
      {/* Radial gradient background */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: phase === 'show' ? 2.5 : 2.2,
          opacity: phase === 'exit' ? 0 : 1,
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`absolute w-[50vmax] h-[50vmax] rounded-full bg-gradient-radial ${config.bgGradient}`}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        {/* Logo with pulse */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
        >
          <AnimatedLogo size="md" showGlow />
        </motion.div>

        {/* Icon circle */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.25, duration: 0.5, type: 'spring', stiffness: 150 }}
          className={`p-6 rounded-full bg-card/80 backdrop-blur-sm border-2 border-border shadow-xl ${config.color}`}
        >
          <Icon size={48} strokeWidth={1.5} />
        </motion.div>

        {/* Panel label */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">
            Entrando no Painel
          </p>
          <h2 className={`text-3xl font-bebas tracking-wider ${config.color}`}>
            {config.label}
          </h2>
        </motion.div>

        {/* Welcome message */}
        {userName && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.3 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>
              Bem-vindo, <span className="text-foreground font-medium">{userName}</span>
            </span>
          </motion.div>
        )}

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="flex gap-1.5 mt-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardEntryTransition;

