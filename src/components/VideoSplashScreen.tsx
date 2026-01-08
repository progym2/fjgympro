import React, { useState, useEffect, useRef } from 'react';
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
  const [isExiting, setIsExiting] = useState(false);
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

  const handleComplete = () => {
    setIsExiting(true);
    sessionStorage.setItem('splashShown', 'true');
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 300);
  };

  const handleVideoEnd = () => {
    setProgress(100);
    setVideoEnded(true);
    setShowImage(true);
    
    // Show image for 1 second then complete
    setTimeout(handleComplete, 1000);
  };

  const handleVideoError = () => {
    // Fallback: show image directly if video fails
    setShowImage(true);
    setProgress(100);
    setTimeout(handleComplete, 1500);
  };

  const handleCanPlay = () => {
    setIsLoaded(true);
  };

  // Skip splash on tap/click
  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleSkip}
    >
      {/* Background gradient - static, no animation */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(40, 20, 10, 0.9) 0%, rgba(0, 0, 0, 1) 70%)'
        }}
      />

      {/* Video phase - show immediately without loading indicator */}
      {!showImage && (
        <div className={`relative w-full h-full flex items-center justify-center transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onCanPlay={handleCanPlay}
            className={`w-full h-full object-contain transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          >
            <source src="/video/splash.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* Image phase */}
      {showImage && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
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
          <p className="absolute bottom-20 text-white/80 text-sm tracking-widest uppercase animate-pulse">
            Toque para continuar
          </p>
        </div>
      )}

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
        <div
          className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip hint - show quickly */}
      {!showImage && isLoaded && (
        <p className="absolute bottom-6 text-white/60 text-xs tracking-wide animate-fade-in">
          Toque para pular
        </p>
      )}
    </div>
  );
};

export default VideoSplashScreen;