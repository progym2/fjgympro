import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Volume1, SkipForward, SkipBack } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { Slider } from '@/components/ui/slider';

const MusicToggle: React.FC = () => {
  const { 
    isMusicPlaying, 
    isMusicEnabled, 
    isOnHomeScreen, 
    toggleMusic, 
    musicVolume, 
    setMusicVolume,
    currentTrackName,
    skipToNextTrack,
    skipToPreviousTrack
  } = useAudio();
  const [showVolume, setShowVolume] = useState(false);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Verificar se precisa de marquee - DEVE estar antes de qualquer return condicional
  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setNeedsMarquee(textWidth > containerWidth);
    }
  }, [currentTrackName, showVolume]);

  // Retorno condicional DEPOIS de todos os hooks
  if (!isOnHomeScreen) {
    return null;
  }

  // Converter volume (0-0.5) para porcentagem (0-100)
  const volumePercent = Math.round((musicVolume / 0.5) * 100);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = (value[0] / 100) * 0.5;
    setMusicVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (!isMusicEnabled || musicVolume === 0) {
      return <VolumeX className="text-muted-foreground" size={20} />;
    }
    if (musicVolume < 0.15) {
      return <Volume1 className="text-primary" size={20} />;
    }
    return <Volume2 className="text-primary" size={20} />;
  };

  return (
    <div className="fixed bottom-14 right-4 z-40 flex flex-col items-end gap-2">
      {/* Volume Slider & Track Info */}
      <AnimatePresence>
        {showVolume && isMusicEnabled && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-card/90 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-lg"
          >
            {/* Track Name with Marquee */}
            {isMusicPlaying && currentTrackName && (
              <div 
                ref={containerRef}
                className="max-w-[160px] overflow-hidden mb-2"
              >
                <p 
                  ref={textRef}
                  className={`text-xs text-primary font-medium text-center whitespace-nowrap ${
                    needsMarquee ? 'animate-marquee' : ''
                  }`}
                  style={needsMarquee ? {
                    animation: 'marquee 8s linear infinite',
                  } : undefined}
                >
                  🎵 {currentTrackName}
                </p>
              </div>
            )}
            
            {/* Volume Slider */}
            <div className="flex items-center gap-3 min-w-[140px]">
              <Volume1 size={14} className="text-muted-foreground flex-shrink-0" />
              <Slider
                value={[volumePercent]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="flex-1"
              />
              <Volume2 size={14} className="text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">
              {volumePercent}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Row */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <AnimatePresence>
          {isMusicEnabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
              onClick={skipToPreviousTrack}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-full bg-card/70 backdrop-blur-md border border-border/40 
                flex items-center justify-center shadow-md hover:border-primary/50 transition-all"
              aria-label="Música anterior"
              title="Música anterior"
            >
              <SkipBack className="text-muted-foreground hover:text-primary transition-colors" size={12} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          onClick={toggleMusic}
          onContextMenu={(e) => {
            e.preventDefault();
            if (isMusicEnabled) setShowVolume(!showVolume);
          }}
          onDoubleClick={() => {
            if (isMusicEnabled) setShowVolume(!showVolume);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`
            w-10 h-10 rounded-full 
            backdrop-blur-md border flex items-center justify-center 
            shadow-lg transition-all duration-300
            ${isMusicEnabled 
              ? 'bg-primary/20 border-primary/40 shadow-primary/20' 
              : 'bg-card/60 border-border/30 shadow-black/20'
            }
          `}
          aria-label={isMusicEnabled ? 'Desativar música' : 'Ativar música'}
          title={isMusicEnabled ? 'Clique duplo para volume | Clique para mutar' : 'Ativar música de fundo'}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isMusicEnabled ? 'enabled' : 'disabled'}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              {isMusicPlaying ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {getVolumeIcon()}
                </motion.div>
              ) : (
                getVolumeIcon()
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Next Button */}
        <AnimatePresence>
          {isMusicEnabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
              onClick={skipToNextTrack}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-full bg-card/70 backdrop-blur-md border border-border/40 
                flex items-center justify-center shadow-md hover:border-primary/50 transition-all"
              aria-label="Próxima música"
              title="Próxima música"
            >
              <SkipForward className="text-muted-foreground hover:text-primary transition-colors" size={12} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      {isMusicEnabled && !showVolume && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="text-[10px] text-muted-foreground text-right mr-1"
        >
          2x clique = volume
        </motion.p>
      )}

      {/* Marquee Animation Styles */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          padding-right: 50px;
        }
        .animate-marquee::after {
          content: attr(data-text);
          padding-left: 50px;
        }
      `}</style>
    </div>
  );
};

export default MusicToggle;
