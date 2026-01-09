import React, { useState, useEffect, useRef, memo } from 'react';

// App version - increment this to show splash again after updates
export const APP_VERSION = '1.0.0';

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

  // Load video immediately
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

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
    localStorage.setItem('splashShown', APP_VERSION);
    
    // Smooth exit with fade
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 400);
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

  // Timeout fallback - if video doesn't load in 8 seconds, skip
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!videoReady && !hasCompletedRef.current) {
        handleComplete();
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [videoReady]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-400 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleSkip}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Dark background */}
      <div className="absolute inset-0 bg-black" />

      {/* Video muted - preload auto for faster loading */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        preload="auto"
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        onCanPlayThrough={handleCanPlayThrough}
        onLoadedData={() => setVideoReady(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
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
