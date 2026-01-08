import React, { useState, useEffect, useRef, memo } from 'react';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = memo(({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  // Check if splash was already shown in this session - do this FIRST
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown === 'true') {
      setIsVisible(false);
      onComplete();
    }
  }, [onComplete]);

  // Progress animation
  useEffect(() => {
    if (videoReady && videoRef.current) {
      const updateProgress = () => {
        if (videoRef.current && !hasCompletedRef.current) {
          const duration = videoRef.current.duration || 3;
          const currentTime = videoRef.current.currentTime || 0;
          setProgress((currentTime / duration) * 100);
          progressRef.current = requestAnimationFrame(updateProgress);
        }
      };
      progressRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [videoReady]);

  const handleComplete = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    
    setIsExiting(true);
    setProgress(100);
    sessionStorage.setItem('splashShown', 'true');
    
    // Quick exit - no extra delays
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 200);
  };

  const handleVideoEnd = () => {
    handleComplete();
  };

  const handleVideoError = () => {
    // Skip directly on error - no fallback image
    handleComplete();
  };

  const handleCanPlayThrough = () => {
    setVideoReady(true);
    // Auto-start playing
    videoRef.current?.play().catch(() => {
      // If autoplay fails, complete immediately
      handleComplete();
    });
  };

  // Skip splash on tap/click
  const handleSkip = () => {
    handleComplete();
  };

  // Timeout fallback - if video doesn't load in 3 seconds, skip
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!videoReady && !hasCompletedRef.current) {
        handleComplete();
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [videoReady]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-200 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleSkip}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Simple dark background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />

      {/* Video - preload metadata only for faster initial load */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        onCanPlayThrough={handleCanPlayThrough}
        className={`w-full h-full object-contain transition-opacity duration-150 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
      >
        <source src="/video/splash.mp4" type="video/mp4" />
      </video>

      {/* Loading indicator while video loads */}
      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Minimal progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
        <div
          className="h-full bg-orange-500 transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip hint */}
      {videoReady && (
        <p className="absolute bottom-4 text-white/50 text-xs">
          Toque para pular
        </p>
      )}
    </div>
  );
});

VideoSplashScreen.displayName = 'VideoSplashScreen';

export default VideoSplashScreen;
