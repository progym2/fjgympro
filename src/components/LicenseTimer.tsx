import React, { useEffect, useState, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Timer, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const LicenseTimer: React.FC = memo(() => {
  const navigate = useNavigate();
  const { license, licenseTimeRemaining, role, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(licenseTimeRemaining || 0);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedOutRef = useRef(false);
  const hasShownInitialRef = useRef(false);

  // Auto-hide after 2 seconds
  const AUTO_HIDE_DELAY = 2000;

  useEffect(() => {
    setCurrentTime(licenseTimeRemaining || 0);
    hasLoggedOutRef.current = false;
    
    // Show briefly on initial load only once
    if (!hasShownInitialRef.current && licenseTimeRemaining && licenseTimeRemaining > 0) {
      hasShownInitialRef.current = true;
      setIsVisible(true);
      
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, AUTO_HIDE_DELAY);
    }
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

  // Memoize time calculations
  const { days, hours, minutes, seconds } = useMemo(() => {
    if (currentTime <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const totalSeconds = Math.floor(currentTime / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }, [currentTime]);

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

  const getCompactTime = () => {
    if (days > 0) {
      return `${days}d ${formatTimeUnit(hours)}h`;
    }
    return `${formatTimeUnit(hours)}:${formatTimeUnit(minutes)}:${formatTimeUnit(seconds)}`;
  };

  return (
    <>
      {/* Full timer - shows on initial load briefly */}
      <AnimatePresence>
        {isVisible && (
          <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center px-4 pt-2 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 0.85, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`
                px-4 sm:px-6 py-2 sm:py-3 rounded-xl backdrop-blur-xl
                bg-gradient-to-r ${bgColor} border
                shadow-2xl shadow-black/20
                flex flex-col sm:flex-row items-center gap-2 sm:gap-4
              `}
            >
              {/* Icon */}
              <div className={`flex items-center gap-2 ${textColor}`}>
                {isLow ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <AlertTriangle size={20} />
                  </motion.div>
                ) : (
                  <Timer size={20} />
                )}
                <span className="font-bebas text-xs sm:text-sm tracking-wider opacity-80">
                  {isDemo ? 'MODO DEMONSTRAÇÃO' : isTrial ? 'PERÍODO DE TESTE' : 'LICENÇA ATIVA'}
                </span>
              </div>

              {/* Timer Display */}
              <div className="flex items-center gap-1 sm:gap-2">
                {days > 0 && (
                  <>
                    <div className="flex flex-col items-center">
                      <span className={`font-bebas text-2xl sm:text-3xl md:text-4xl tracking-wider ${textColor}`}>
                        {formatTimeUnit(days)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">Dias</span>
                    </div>
                    <span className={`font-bebas text-xl sm:text-2xl ${textColor} opacity-50`}>:</span>
                  </>
                )}

                <div className="flex flex-col items-center">
                  <span className={`font-bebas text-2xl sm:text-3xl md:text-4xl tracking-wider ${textColor}`}>
                    {formatTimeUnit(hours)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">Hrs</span>
                </div>

                <span className={`font-bebas text-xl sm:text-2xl ${textColor} opacity-50`}>:</span>

                <div className="flex flex-col items-center">
                  <span className={`font-bebas text-2xl sm:text-3xl md:text-4xl tracking-wider ${textColor}`}>
                    {formatTimeUnit(minutes)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">Min</span>
                </div>

                <span className={`font-bebas text-xl sm:text-2xl ${textColor} opacity-50`}>:</span>

                <div className="flex flex-col items-center">
                  <span className={`font-bebas text-2xl sm:text-3xl md:text-4xl tracking-wider ${textColor}`}>
                    {formatTimeUnit(seconds)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">Seg</span>
                </div>
              </div>

              {isLow && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-destructive"
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mini floating icon - always visible in corner, expands on hover */}
      {!isVisible && (
        <div 
          className="fixed top-2 right-2 z-[60]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            {isHovered ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={{ duration: 0.2 }}
                className={`
                  px-3 py-2 rounded-lg backdrop-blur-xl cursor-pointer
                  bg-gradient-to-r ${bgColor} border
                  shadow-lg shadow-black/10
                  flex items-center gap-2
                `}
                onClick={() => setIsVisible(true)}
              >
                <Clock size={14} className={textColor} />
                <span className={`font-bebas text-sm tracking-wider ${textColor}`}>
                  {getLabel()}
                </span>
                <span className={`font-bebas text-sm tracking-wider ${textColor}`}>
                  {getCompactTime()}
                </span>
                {isLow && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-destructive"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="minimized"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileHover={{ opacity: 1, scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className={`
                  w-8 h-8 rounded-full backdrop-blur-xl cursor-pointer
                  bg-gradient-to-r ${bgColor} border
                  shadow-md shadow-black/10
                  flex items-center justify-center
                `}
                onClick={() => setIsVisible(true)}
              >
                <Clock size={14} className={textColor} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
});

LicenseTimer.displayName = 'LicenseTimer';

export default LicenseTimer;
