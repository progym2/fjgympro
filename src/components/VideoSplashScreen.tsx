import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasShownRef = useRef(false);

  // Check if splash was already shown in this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown === 'true') {
      hasShownRef.current = true;
      setIsVisible(false);
      onComplete();
      return;
    }

    // Show skip button after 2 seconds
    const skipTimer = setTimeout(() => setShowSkip(true), 2000);

    return () => clearTimeout(skipTimer);
  }, [onComplete]);

  const handleVideoEnd = () => {
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleVideoError = () => {
    // If video fails to load, skip splash
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    onComplete();
  };

  // If already shown this session, don't render
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
        >
          {/* Video Container */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            className="absolute inset-0 w-full h-full object-cover"
            poster="/placeholder.svg"
          >
            <source src="/video/splash.mp4" type="video/mp4" />
          </video>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 pointer-events-none" />

          {/* Skip Button */}
          <AnimatePresence>
            {showSkip && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={handleSkip}
                className="absolute bottom-8 right-6 px-4 py-2 bg-white/10 backdrop-blur-sm 
                           border border-white/20 rounded-full text-white/90 text-sm font-medium
                           hover:bg-white/20 transition-colors active:scale-95"
              >
                Pular
              </motion.button>
            )}
          </AnimatePresence>

          {/* Loading Indicator */}
          <div className="absolute bottom-8 left-6">
            <motion.div
              className="h-1 bg-primary/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 8, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoSplashScreen;
