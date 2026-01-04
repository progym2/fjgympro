import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCompletedRef = useRef(false);

  const handleComplete = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setIsVideoEnded(true);
    setTimeout(onComplete, 300);
  };

  // Tentar reproduzir o vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptPlay = async () => {
      try {
        video.muted = true; // Sempre mudo para garantir autoplay
        video.playbackRate = 1.5; // Acelerar vídeo
        await video.play();
      } catch (err) {
        console.error('Falha ao reproduzir vídeo:', err);
        setVideoError(true);
        handleComplete();
      }
    };

    if (videoLoaded) {
      attemptPlay();
    }
  }, [videoLoaded]);

  // Fallback rápido - pula após 3 segundos se o vídeo não carregar
  useEffect(() => {
    const quickTimeout = setTimeout(() => {
      if (!videoLoaded && !hasCompletedRef.current) {
        console.log('Vídeo demorou - pulando splash');
        handleComplete();
      }
    }, 2000);

    // Timeout máximo de 5 segundos
    const maxTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log('Timeout máximo - pulando splash');
        handleComplete();
      }
    }, 5000);

    return () => {
      clearTimeout(quickTimeout);
      clearTimeout(maxTimeout);
    };
  }, [videoLoaded]);

  const handleVideoCanPlay = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    setVideoError(true);
    handleComplete();
  };

  return (
    <AnimatePresence>
      {!isVideoEnded && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={handleComplete}
        >
          {!videoError ? (
            <video
              ref={videoRef}
              playsInline
              muted
              preload="auto"
              onCanPlay={handleVideoCanPlay}
              onEnded={handleComplete}
              onError={handleVideoError}
              className="w-full h-full object-cover"
            >
              <source src="/videos/intro.mp4" type="video/mp4" />
            </video>
          ) : (
            <div className="text-white text-center">
              <p>Carregando...</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
