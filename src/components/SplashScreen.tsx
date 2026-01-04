import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCompletedRef = useRef(false);

  const handleComplete = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setIsVideoEnded(true);
    setTimeout(onComplete, 500);
  };

  // Tentar reproduzir o vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptPlay = async () => {
      try {
        video.muted = true; // Sempre mudo para garantir autoplay
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

  // Mostrar botão de pular após 2 segundos
  useEffect(() => {
    const skipTimer = setTimeout(() => {
      setShowSkipButton(true);
    }, 2000);

    // Timeout máximo de 15 segundos
    const maxTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log('Timeout máximo - finalizando splash');
        handleComplete();
      }
    }, 15000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(maxTimeout);
    };
  }, []);

  // Fallback se o vídeo não carregar em 5 segundos
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!videoLoaded && !hasCompletedRef.current) {
        console.log('Vídeo não carregou - pulando splash');
        handleComplete();
      }
    }, 5000);

    return () => clearTimeout(fallbackTimer);
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
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        >
          {!videoError ? (
            <>
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
                <source src="/videos/intro-app.mp4" type="video/mp4" />
              </video>
              
              {/* Botão de Pular */}
              <AnimatePresence>
                {showSkipButton && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={handleComplete}
                    className="absolute bottom-8 right-8 px-6 py-2 bg-white/10 backdrop-blur-md 
                      border border-white/20 rounded-full text-white/80 text-sm font-medium
                      hover:bg-white/20 hover:text-white transition-all"
                  >
                    Pular ›
                  </motion.button>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-white text-center"
            >
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">Carregando...</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
