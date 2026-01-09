import React, { useEffect, useRef, useState, memo } from 'react';

// App version - increment this to show splash again after updates
export const APP_VERSION = '1.0.3';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = memo(({ onComplete }) => {
  const [videoReady, setVideoReady] = useState(false);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  const handleComplete = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    setIsExiting(true);
    setProgress(100);
    localStorage.setItem('splashShown', APP_VERSION);

    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const ensureNormalSpeed = () => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = 1;
    v.defaultPlaybackRate = 1;
  };

  const tryPlay = async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      ensureNormalSpeed();
      await v.play();
      setNeedsUserPlay(false);
    } catch {
      // Autoplay bloqueado (comum em mobile/PWA): pede toque do usuário, não pula.
      setNeedsUserPlay(true);
    }
  };

  // Load video immediately
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      ensureNormalSpeed();
    }
  }, []);

  // Progress animation (RAF para suavidade)
  useEffect(() => {
    const v = videoRef.current;
    if (!videoReady || !v) return;

    const update = () => {
      if (!videoRef.current || hasCompletedRef.current) return;
      const duration = videoRef.current.duration || 3;
      const currentTime = videoRef.current.currentTime || 0;
      setProgress((currentTime / duration) * 100);
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoReady]);

  // When ready, attempt autoplay
  useEffect(() => {
    if (!videoReady) return;
    tryPlay();
  }, [videoReady]);

  const handleUserPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    tryPlay();
  };

  // Tap/click: if autoplay was blocked, this tap should start the video (not skip)
  const handleRootClick = () => {
    if (needsUserPlay) {
      void tryPlay();
      return;
    }
    handleComplete();
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-[400ms] ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleRootClick}
      style={{ touchAction: 'manipulation' }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        autoPlay
        onEnded={handleComplete}
        onError={handleComplete}
        onLoadedMetadata={() => {
          ensureNormalSpeed();
          setVideoReady(true);
        }}
        onCanPlayThrough={() => {
          ensureNormalSpeed();
          setVideoReady(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Cache-busting para evitar PWA/Service Worker servir vídeo antigo */}
        <source src={`/video/splash.mp4?v=${APP_VERSION}`} type="video/mp4" />
      </video>

      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {needsUserPlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={handleUserPlay}
            className="px-4 py-3 rounded-md bg-black/60 text-white text-sm"
          >
            Toque para iniciar
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
        <div
          className="h-full bg-orange-500 transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      {videoReady && !needsUserPlay && (
        <p className="absolute bottom-4 text-white/50 text-xs">Toque para pular</p>
      )}
    </div>
  );
});

VideoSplashScreen.displayName = 'VideoSplashScreen';

export default VideoSplashScreen;

