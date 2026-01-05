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
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
        >
          {/* Gradient overlay for smooth color transition */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />
          
          {/* Subtle glow effect matching primary color */}
          <motion.div 
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: showLogo ? 0.25 : 0.15 }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'radial-gradient(circle at center, hsl(24 100% 50% / 0.4) 0%, transparent 60%)'
            }}
          />

          {/* Video phase - fast fade out */}
          <AnimatePresence mode="wait">
            {!showLogo && (
              <motion.div
                key="video"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {/* Loading indicator while video loads */}
                {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin"
                      style={{ borderWidth: '3px' }}
                    />
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
                  className="w-full h-full object-contain"
                >
                  <source src="/video/splash.mp4" type="video/mp4" />
                </video>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo phase - after video ends */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                key="logo"
                className="absolute inset-0 flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Logo with scale and glow animation */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ 
                    scale: [0.5, 1.1, 1],
                    opacity: 1,
                    y: 0
                  }}
                  transition={{ 
                    duration: 0.8,
                    times: [0, 0.6, 1],
                    ease: "easeOut"
                  }}
                  className="relative"
                >
                  {/* Glow effect behind logo */}
                  <motion.div
                    className="absolute inset-0 blur-2xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.6, 0.4], scale: [0.8, 1.2, 1] }}
                    transition={{ duration: 1, delay: 0.2 }}
                    style={{
                      background: 'radial-gradient(circle, hsl(24 100% 50% / 0.5) 0%, transparent 70%)'
                    }}
                  />
                  
                  <motion.img
                    src={logomarca}
                    alt="fjGymPro"
                    className="w-40 h-40 sm:w-52 sm:h-52 object-contain relative z-10 drop-shadow-2xl"
                    style={{
                      filter: 'drop-shadow(0 0 30px hsl(24 100% 50% / 0.4))'
                    }}
                  />
                </motion.div>

                {/* App name with stagger animation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-6 text-center"
                >
                  <motion.h1 
                    className="text-4xl sm:text-5xl font-display tracking-wider"
                    initial={{ opacity: 0, letterSpacing: '0.5em' }}
                    animate={{ opacity: 1, letterSpacing: '0.1em' }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <span className="text-primary">fj</span>
                    <span className="text-foreground">GymPro</span>
                  </motion.h1>
                  
                  <motion.p
                    className="text-muted-foreground text-sm mt-2 tracking-widest uppercase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                  >
                    Sua evolução começa aqui
                  </motion.p>
                </motion.div>

                {/* Trigger completion after logo animation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  onAnimationComplete={handleLogoAnimationComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom gradient fade */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoSplashScreen;
