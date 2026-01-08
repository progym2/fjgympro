import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, SportTheme, SPORT_THEMES } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeTransitionOverlayProps {
  duration?: number;
}

const ThemeTransitionOverlay: React.FC<ThemeTransitionOverlayProps> = ({ duration = 600 }) => {
  const { currentTheme, themeConfig } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousTheme, setPreviousTheme] = useState<SportTheme>(currentTheme);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (currentTheme !== previousTheme) {
      setIsTransitioning(true);
      setShowOverlay(true);
      
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousTheme(currentTheme);
      }, duration);

      const hideTimer = setTimeout(() => {
        setShowOverlay(false);
      }, duration + 200);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [currentTheme, previousTheme, duration]);

  const ThemeIcon = themeConfig.icons.main;

  // Get gradient colors for the current theme
  const getThemeGradient = (theme: SportTheme) => {
    const config = SPORT_THEMES.find(t => t.id === theme);
    if (!config) return 'from-primary to-primary';
    return config.gradient;
  };

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        >
          {/* Radial wipe effect */}
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ 
              duration: duration / 1000, 
              ease: [0.25, 0.1, 0.25, 1] 
            }}
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-[150vmax] h-[150vmax] rounded-full',
              'bg-gradient-to-br',
              getThemeGradient(currentTheme)
            )}
          />

          {/* Center icon animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1], 
              rotate: [180, 0], 
              opacity: [0, 1, 1, 0] 
            }}
            transition={{ 
              duration: duration / 1000,
              times: [0, 0.4, 0.6, 1],
              ease: 'easeOut'
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center',
              'bg-gradient-to-br shadow-2xl',
              getThemeGradient(currentTheme)
            )}>
              <ThemeIcon className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
          </motion.div>

          {/* Particle burst effect */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: '50%', 
                y: '50%', 
                scale: 0, 
                opacity: 1 
              }}
              animate={{ 
                x: `${50 + Math.cos((i * Math.PI * 2) / 8) * 60}%`,
                y: `${50 + Math.sin((i * Math.PI * 2) / 8) * 60}%`,
                scale: [0, 1, 0.5],
                opacity: [1, 1, 0]
              }}
              transition={{ 
                duration: duration / 1000 * 0.8,
                ease: 'easeOut',
                delay: 0.1
              }}
              className={cn(
                'absolute w-4 h-4 rounded-full',
                'bg-gradient-to-br',
                getThemeGradient(currentTheme)
              )}
              style={{
                left: 0,
                top: 0,
              }}
            />
          ))}

          {/* Theme name flash */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -20] }}
            transition={{ 
              duration: duration / 1000,
              times: [0, 0.3, 0.7, 1]
            }}
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2"
          >
            <span className={cn(
              'font-bebas text-3xl tracking-widest text-white',
              'drop-shadow-lg'
            )}>
              {themeConfig.emoji} {themeConfig.name.toUpperCase()}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThemeTransitionOverlay;
