import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
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
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
        >
          {/* Gradient overlay for smooth color transition */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />
          
          {/* Subtle glow effect matching primary color */}
          <motion.div 
            className="absolute inset-0 opacity-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            style={{
              background: 'radial-gradient(circle at center, hsl(24 100% 50% / 0.3) 0%, transparent 70%)'
            }}
          />

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

          {/* Video container with proper sizing */}
          <motion.div
            initial={{ scale: 1.02, opacity: 0 }}
            animate={{ scale: 1, opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full h-full flex items-center justify-center"
          >
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

          {/* Bottom gradient fade to app background */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
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
