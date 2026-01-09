import React, { useEffect, useRef, forwardRef, memo } from 'react';
import { motion } from 'framer-motion';
import { User, Dumbbell, Shield } from 'lucide-react';

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
    bg: 'bg-primary/20',
  },
  instructor: {
    label: 'INSTRUTOR',
    icon: Dumbbell,
    color: 'text-green-500',
    bg: 'bg-green-500/20',
  },
  admin: {
    label: 'GERENTE',
    icon: Shield,
    color: 'text-blue-500',
    bg: 'bg-blue-500/20',
  },
} as const;

const DashboardEntryTransition = memo(forwardRef<HTMLDivElement, DashboardEntryTransitionProps>(({
  panelType,
  onComplete,
}, ref) => {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Ultra-fast transition - 200ms total
    const timer = window.setTimeout(() => onCompleteRef.current(), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const config = panelConfig[panelType];
  const Icon = config.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.1 }}
        className="flex flex-col items-center gap-3"
      >
        <div className={`p-4 rounded-full ${config.bg} ${config.color}`}>
          <Icon size={32} strokeWidth={1.5} />
        </div>
        <h2 className={`text-xl font-bebas tracking-wider ${config.color}`}>
          {config.label}
        </h2>
      </motion.div>
    </motion.div>
  );
}));

DashboardEntryTransition.displayName = 'DashboardEntryTransition';

export default DashboardEntryTransition;
