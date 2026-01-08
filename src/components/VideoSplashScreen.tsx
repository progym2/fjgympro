import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashBackground from '@/assets/splash-background.png';

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
  const [videoEnded, setVideoEnded] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Check if splash was already shown in this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown === 'true') {
      setIsVisible(false);
      onComplete();
    }
  }, [onComplete]);

  // Start progress animation when video is loaded
  useEffect(() => {
    if (isLoaded && !videoEnded) {
      progressRef.current = setInterval(() => {
        if (videoRef.current) {
          const duration = videoRef.current.duration || 5;
          const currentTime = videoRef.current.currentTime || 0;
          setProgress((currentTime / duration) * 100);
        }
      }, 50);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isLoaded, videoEnded]);

  const handleVideoEnd = () => {
    setProgress(100);
    setVideoEnded(true);
    setShowImage(true);
    
    // Show image for 1.5 seconds then complete
    setTimeout(() => {
      sessionStorage.setItem('splashShown', 'true');
      setIsVisible(false);
      onComplete();
    }, 1500);
  };

  const handleVideoError = () => {
    // Fallback: show image directly if video fails
    setShowImage(true);
    setProgress(100);
    
    setTimeout(() => {
      sessionStorage.setItem('splashShown', 'true');
      setIsVisible(false);
      onComplete();
    }, 2000);
  };

  const handleCanPlay = () => {
    setIsLoaded(true);
  };

  // Skip splash on tap/click
  const handleSkip = () => {
    sessionStorage.setItem('splashShown', 'true');
    setIsVisible(false);
    onComplete();
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
          onClick={handleSkip}
        >
          {/* Background gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(40, 20, 10, 0.9) 0%, rgba(0, 0, 0, 1) 70%)'
            }}
          />

          {/* Animated fire particles effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: `hsl(${20 + Math.random() * 20}, 100%, ${50 + Math.random() * 30}%)`,
                  left: `${Math.random() * 100}%`,
                  bottom: '-5%',
                }}
                animate={{
                  y: [0, -window.innerHeight * 1.2],
                  x: [0, (Math.random() - 0.5) * 100],
                  opacity: [0.8, 0],
                  scale: [1, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Video phase */}
          <AnimatePresence mode="wait">
            {!showImage && (
              <motion.div
                key="video"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {!isLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
                    <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-orange-400 text-sm animate-pulse">Carregando...</p>
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
                  className={`w-full h-full object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                >
                  <source src="/video/splash.mp4" type="video/mp4" />
                </video>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image phase */}
          <AnimatePresence>
            {showImage && (
              <motion.div
                key="splash-image"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <img
                  src={splashBackground}
                  alt="GymPro - Sua evolução começa aqui"
                  className="w-full h-full object-cover"
                  style={{
                    filter: 'brightness(1.1) contrast(1.05)',
                  }}
                />
                
                {/* Overlay gradient for better text visibility */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)'
                  }}
                />

                {/* Tap to continue text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute bottom-20 text-white/80 text-sm tracking-widest uppercase"
                >
                  Toque para continuar
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500"
              style={{ width: `${progress}%` }}
              initial={{ width: '0%' }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Skip hint */}
          {!showImage && isLoaded && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1 }}
              className="absolute bottom-6 text-white/60 text-xs tracking-wide"
            >
              Toque para pular
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoSplashScreen;
