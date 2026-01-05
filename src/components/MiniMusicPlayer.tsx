import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, VolumeX, Volume1, SkipForward, SkipBack, Play, Pause,
  Music, Radio, Headphones, Disc, Disc3, Music2, Music4,
  Flame, Waves, TreePine, Zap, Sparkles, Heart
} from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { Slider } from '@/components/ui/slider';

// Ícones diferentes para cada tema
const themePlayerIcons: Record<SportTheme, {
  play: typeof Play;
  pause: typeof Pause;
  music: typeof Music;
}> = {
  fire: { play: Flame, pause: Flame, music: Music },
  ocean: { play: Waves, pause: Waves, music: Radio },
  forest: { play: TreePine, pause: TreePine, music: Music2 },
  lightning: { play: Zap, pause: Zap, music: Disc3 },
  galaxy: { play: Sparkles, pause: Sparkles, music: Disc },
  iron: { play: Disc, pause: Disc, music: Headphones },
  blood: { play: Heart, pause: Heart, music: Music4 },
  neon: { play: Sparkles, pause: Sparkles, music: Disc3 },
  gold: { play: Music, pause: Music, music: Radio },
};

const MiniMusicPlayer: React.FC = () => {
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
  
  const { currentTheme, themeConfig } = useTheme();
  
  const [showControls, setShowControls] = useState(false);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Verificar se precisa de marquee
  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setNeedsMarquee(textWidth > containerWidth);
    }
  }, [currentTrackName, showControls]);

  if (!isOnHomeScreen) {
    return null;
  }

  // Obter ícones do tema atual
  const icons = themePlayerIcons[currentTheme] || themePlayerIcons.fire;
  const PlayIcon = icons.play;
  const PauseIcon = icons.pause;
  const MusicIcon = icons.music;

  // Converter volume (0-0.5) para porcentagem (0-100)
  const volumePercent = Math.round((musicVolume / 0.5) * 100);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = (value[0] / 100) * 0.5;
    setMusicVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (!isMusicEnabled || musicVolume === 0) {
      return <VolumeX className="text-muted-foreground" size={16} />;
    }
    if (musicVolume < 0.15) {
      return <Volume1 className="text-primary" size={16} />;
    }
    return <Volume2 className="text-primary" size={16} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40"
    >
      {/* Player Container */}
      <div 
        className={`
          bg-card/80 backdrop-blur-xl border border-border/50 
          shadow-lg transition-all duration-300
          ${themeConfig.buttonShape === 'pill' ? 'rounded-full' : 
            themeConfig.buttonShape === 'sharp' ? 'rounded-md' : 'rounded-xl'}
          ${isMusicPlaying ? 'shadow-primary/20' : 'shadow-black/20'}
        `}
        style={{
          boxShadow: isMusicPlaying 
            ? `0 8px 32px hsl(${themeConfig.primary} / 0.25)` 
            : undefined
        }}
      >
        {/* Expanded Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', paddingTop: 12, paddingBottom: 8 }}
              exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
              className="px-4 overflow-hidden border-b border-border/30"
            >
              {/* Track Name with Marquee */}
              {currentTrackName && (
                <div 
                  ref={containerRef}
                  className="max-w-[200px] mx-auto overflow-hidden mb-3"
                >
                  <p 
                    ref={textRef}
                    className={`text-xs text-center whitespace-nowrap ${
                      needsMarquee ? 'animate-marquee' : ''
                    }`}
                    style={{
                      color: `hsl(${themeConfig.primary})`,
                      animation: needsMarquee ? 'marquee 8s linear infinite' : undefined,
                    }}
                  >
                    <MusicIcon className="inline-block mr-1" size={12} />
                    {currentTrackName}
                  </p>
                </div>
              )}
              
              {/* Volume Slider */}
              <div className="flex items-center gap-2 min-w-[180px]">
                <Volume1 size={12} className="text-muted-foreground flex-shrink-0" />
                <Slider
                  value={[volumePercent]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <Volume2 size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {volumePercent}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Controls */}
        <div className="flex items-center gap-1 px-2 py-2">
          {/* Previous Button */}
          <motion.button
            onClick={skipToPreviousTrack}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={!isMusicEnabled}
            className={`
              w-8 h-8 flex items-center justify-center transition-all
              ${!isMusicEnabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'}
            `}
            aria-label="Música anterior"
          >
            <SkipBack size={14} className="text-muted-foreground" />
          </motion.button>

          {/* Play/Pause Button */}
          <motion.button
            onClick={() => {
              toggleMusic();
            }}
            onDoubleClick={() => setShowControls(!showControls)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              w-11 h-11 rounded-full flex items-center justify-center 
              transition-all duration-300 relative
              ${isMusicEnabled 
                ? 'bg-primary/20 border-2 border-primary/60' 
                : 'bg-muted/50 border-2 border-border/50'
              }
            `}
            style={{
              boxShadow: isMusicPlaying 
                ? `0 0 20px hsl(${themeConfig.primary} / 0.4)` 
                : undefined
            }}
            aria-label={isMusicEnabled ? 'Pausar' : 'Reproduzir'}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isMusicPlaying ? 'playing' : 'paused'}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {isMusicPlaying ? (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.15, 1],
                      opacity: [1, 0.8, 1]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <PauseIcon 
                      size={20} 
                      className="text-primary"
                      style={{ color: `hsl(${themeConfig.primary})` }}
                    />
                  </motion.div>
                ) : (
                  <PlayIcon 
                    size={20} 
                    className="text-muted-foreground"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Playing indicator ring */}
            {isMusicPlaying && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.button>

          {/* Next Button */}
          <motion.button
            onClick={skipToNextTrack}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={!isMusicEnabled}
            className={`
              w-8 h-8 flex items-center justify-center transition-all
              ${!isMusicEnabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'}
            `}
            aria-label="Próxima música"
          >
            <SkipForward size={14} className="text-muted-foreground" />
          </motion.button>

          {/* Volume Toggle */}
          <motion.button
            onClick={() => setShowControls(!showControls)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 flex items-center justify-center"
            aria-label="Mostrar volume"
          >
            {getVolumeIcon()}
          </motion.button>
        </div>
      </div>

      {/* Help Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="text-[10px] text-center text-muted-foreground mt-1"
      >
        {!showControls ? '2x clique para volume' : ''}
      </motion.p>

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
      `}</style>
    </motion.div>
  );
};

export default MiniMusicPlayer;
