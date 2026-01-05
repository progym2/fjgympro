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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
        >
          {/* Loading indicator while video loads */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Video - object-contain to avoid zoom */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={handleCanPlay}
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src="/video/splash.mp4" type="video/mp4" />
          </video>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoSplashScreen;
