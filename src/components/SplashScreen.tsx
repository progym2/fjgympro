import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
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
        setNeedsUserInteraction(false);
      } catch (err) {
        console.error('Autoplay bloqueado (aguardando toque):', err);
        setNeedsUserInteraction(true);
        setShowSkipButton(true);
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


  const handleVideoCanPlay = () => {
    setVideoLoaded(true);
  };

  const handleManualPlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // Com gesto do usuário, podemos tocar normalmente
      video.muted = false;
      await video.play();
      setNeedsUserInteraction(false);
    } catch (err) {
      console.error('Falha ao iniciar vídeo manualmente:', err);
      // Mantém o overlay visível para nova tentativa
      setNeedsUserInteraction(true);
    }
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

              {/* Se autoplay for bloqueado, pedir toque do usuário */}
              <AnimatePresence>
                {needsUserInteraction && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <motion.button
                      initial={{ scale: 0.96, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.96, opacity: 0 }}
                      onClick={handleManualPlay}
                      className="px-6 py-3 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white font-medium hover:bg-white/25 transition-all"
                    >
                      Toque para iniciar
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              
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
