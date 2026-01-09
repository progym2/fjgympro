import React, { useState, useEffect, useRef, memo } from 'react';

// App version - increment this to show splash again after updates
export const APP_VERSION = '1.0.2';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = memo(({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Progress bar update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration > 0 && !hasCompletedRef.current) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  // Try to play video on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force video to play
    const playVideo = async () => {
      try {
        video.muted = true; // Must be muted for autoplay
        video.playbackRate = 1;
        await video.play();
      } catch (err) {
        console.log('Video autoplay failed, skipping splash');
        handleComplete();
      }
    };

    // Small delay to ensure video is loaded
    const timer = setTimeout(playVideo, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-[400ms] ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleComplete}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        onEnded={handleComplete}
        onError={handleComplete}
        className="w-full h-full object-cover"
      >
        <source src="/video/splash.mp4" type="video/mp4" />
      </video>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
        <div
          className="h-full bg-orange-500 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip hint */}
      <p className="absolute bottom-4 text-white/50 text-xs">
        Toque para pular
      </p>
    </div>
  );
});

VideoSplashScreen.displayName = 'VideoSplashScreen';

export default VideoSplashScreen;
