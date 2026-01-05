import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logomarca from '@/assets/logomarca.png';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

// Preload video on module load
const videoPreloadLink = document.createElement('link');
videoPreloadLink.rel = 'preload';
videoPreloadLink.as = 'video';
videoPreloadLink.href = '/video/splash.mp4';
document.head.appendChild(videoPreloadLink);

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if splash was already shown in this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown === 'true') {
      setIsVisible(false);
      onComplete();
    }
  }, [onComplete]);

  const handleVideoEnd = () => {
    // Immediately show logo - no delay
    setShowLogo(true);
  };

  const handleLogoAnimationComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleVideoError = () => {
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleCanPlay = () => {
    setIsLoaded(true);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(circle at center, hsl(24 100% 50% / 0.4) 0%, transparent 60%)'
            }}
          />

          {/* Video phase */}
          <AnimatePresence mode="wait">
            {!showLogo && (
              <motion.div
                key="video"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onEnded={handleVideoEnd}
                  onError={handleVideoError}
                  onCanPlay={handleCanPlay}
                  className={`w-full h-full object-contain ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                >
                  <source src="/video/splash.mp4" type="video/mp4" />
                </video>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo phase - ultra fast */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                key="logo"
                className="absolute inset-0 flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <div 
                    className="absolute inset-0 blur-2xl opacity-50"
                    style={{
                      background: 'radial-gradient(circle, hsl(24 100% 50% / 0.5) 0%, transparent 70%)'
                    }}
                  />
                  <img
                    src={logomarca}
                    alt="fjGymPro"
                    className="w-36 h-36 sm:w-44 sm:h-44 object-contain relative z-10"
                    style={{ filter: 'drop-shadow(0 0 20px hsl(24 100% 50% / 0.4))' }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: 0.1 }}
                  className="mt-4 text-center"
                >
                  <h1 className="text-3xl sm:text-4xl font-display tracking-wider">
                    <span className="text-primary">fj</span>
                    <span className="text-foreground">GymPro</span>
                  </h1>
                  <p className="text-muted-foreground text-xs mt-1 tracking-widest uppercase">
                    Sua evolução começa aqui
                  </p>
                </motion.div>

                {/* Complete after 0.5s */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onAnimationComplete={handleLogoAnimationComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoSplashScreen;
