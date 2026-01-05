import React, { useEffect, useState, useRef, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Timer, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const LicenseTimer: React.FC = memo(() => {
  const navigate = useNavigate();
  const { license, licenseTimeRemaining, role, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(licenseTimeRemaining || 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedOutRef = useRef(false);

  // Auto-hide after 4 seconds
  const AUTO_HIDE_DELAY = 4000;

  useEffect(() => {
    setCurrentTime(licenseTimeRemaining || 0);
    hasLoggedOutRef.current = false;
  }, [licenseTimeRemaining]);

  useEffect(() => {
    if (currentTime <= 0) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = Math.max(0, prev - 1000);
        
        // Force logout when time reaches zero
        if (newTime <= 0 && !hasLoggedOutRef.current && license?.type !== 'master' && role !== 'master') {
          hasLoggedOutRef.current = true;
          
          toast.error(
            license?.type === 'demo' 
              ? 'Período de demonstração encerrado!' 
              : 'Sua licença expirou!',
            { duration: 5000 }
          );
          
          setTimeout(async () => {
            await signOut();
            navigate('/');
          }, 1500);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTime > 0, license?.type, role, signOut, navigate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle click to expand and auto-hide
  const handleClick = useCallback(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    setIsExpanded(true);
    
    // Auto-hide after delay
    hideTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, AUTO_HIDE_DELAY);
  }, []);

  // Hide for master users completely
  if (role === 'master' || !license || license.type === 'master') {
    return null;
  }

  // Only show if there's time remaining
  if (!currentTime || currentTime <= 0) {
    return null;
  }

  const isDemo = license.type === 'demo';
  const isTrial = license.type === 'trial';
  const isFull = license.type === 'full';

  const formatTimeUnit = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  // Time calculations
  const totalSeconds = Math.floor(currentTime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const getLabel = () => {
    if (isDemo) return 'DEMO';
    if (isTrial) return 'TRIAL';
    if (isFull) return 'LICENÇA';
    return 'LICENÇA';
  };

  const isLow = isDemo 
    ? currentTime < 5 * 60 * 1000
    : isTrial 
      ? currentTime < 24 * 60 * 60 * 1000
      : currentTime < 3 * 24 * 60 * 60 * 1000;

  const bgColor = isLow 
    ? 'from-destructive/30 to-destructive/10 border-destructive/50' 
    : isFull
      ? 'from-green-500/20 to-green-500/5 border-green-500/30'
      : 'from-primary/20 to-primary/5 border-primary/30';

  const textColor = isLow 
    ? 'text-destructive' 
    : isFull 
      ? 'text-green-400' 
      : 'text-primary';

  const iconBgColor = isLow
    ? 'bg-destructive/20 border-destructive/40'
    : isFull
      ? 'bg-green-500/20 border-green-500/30'
      : 'bg-primary/20 border-primary/30';

  const getCompactTime = () => {
    if (days > 0) {
      return `${days}d ${formatTimeUnit(hours)}h`;
    }
    if (hours > 0) {
      return `${formatTimeUnit(hours)}:${formatTimeUnit(minutes)}:${formatTimeUnit(seconds)}`;
    }
    return `${formatTimeUnit(minutes)}:${formatTimeUnit(seconds)}`;
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`
              absolute top-1/2 -translate-y-1/2 left-0 z-50
              px-2 py-1.5 rounded-lg backdrop-blur-xl cursor-pointer
              bg-gradient-to-r ${bgColor} border
              shadow-lg shadow-black/20
              flex items-center gap-2 whitespace-nowrap
            `}
            onClick={handleClick}
          >
            {/* Icon */}
            <div className={`flex items-center gap-1.5 ${textColor}`}>
              {isLow ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <AlertTriangle size={14} />
                </motion.div>
              ) : (
                <Timer size={14} />
              )}
              <span className="font-bebas text-[10px] tracking-wider opacity-80">
                {isDemo ? 'DEMO' : isTrial ? 'TRIAL' : 'LICENÇA'}
              </span>
            </div>

            {/* Timer Display */}
            <div className="flex items-center gap-0.5">
              {days > 0 && (
                <>
                  <span className={`font-bebas text-sm tracking-wider ${textColor}`}>
                    {formatTimeUnit(days)}d
                  </span>
                  <span className={`font-bebas text-xs ${textColor} opacity-50`}>:</span>
                </>
              )}

              <span className={`font-bebas text-sm tracking-wider ${textColor}`}>
                {formatTimeUnit(hours)}
              </span>
              <span className={`font-bebas text-xs ${textColor} opacity-50`}>:</span>
              <span className={`font-bebas text-sm tracking-wider ${textColor}`}>
                {formatTimeUnit(minutes)}
              </span>
              <span className={`font-bebas text-xs ${textColor} opacity-50`}>:</span>
              <span className={`font-bebas text-sm tracking-wider ${textColor}`}>
                {formatTimeUnit(seconds)}
              </span>
            </div>

            {isLow && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-destructive"
              />
            )}
          </motion.div>
        ) : (
          <motion.button
            key="minimized"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`
              w-6 h-6 rounded-full backdrop-blur-sm
              ${iconBgColor} border
              flex items-center justify-center
              relative
            `}
            onClick={handleClick}
            aria-label="Ver tempo de licença"
          >
            <Clock size={12} className={textColor} />
            
            {/* Pulse indicator for demo/trial */}
            {(isDemo || isTrial || isLow) && (
              <motion.div
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${isLow ? 'bg-destructive' : 'bg-primary'}`}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

LicenseTimer.displayName = 'LicenseTimer';

export default LicenseTimer;
