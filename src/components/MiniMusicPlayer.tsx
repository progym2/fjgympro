import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, VolumeX, Volume1, SkipForward, SkipBack, Play, Pause,
  Music, Radio, Headphones, Disc, Disc3, Music2, Music4,
  Flame, Waves, TreePine, Zap, Sparkles, Heart, ChevronUp
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
    isOnHomeScreen, 
    toggleMusic, 
    musicVolume, 
    setMusicVolume,
    currentTrackName,
    skipToNextTrack,
    skipToPreviousTrack
  } = useAudio();
  
  const { currentTheme, themeConfig } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Não renderizar se não estiver na home
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          // Expanded Player
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={`
              bg-card/95 backdrop-blur-xl border border-border/50 
              shadow-xl p-3 w-48
              ${themeConfig.buttonShape === 'pill' ? 'rounded-2xl' : 
                themeConfig.buttonShape === 'sharp' ? 'rounded-md' : 'rounded-xl'}
            `}
            style={{
              boxShadow: isMusicPlaying 
                ? `0 8px 32px hsl(${themeConfig.primary} / 0.3)` 
                : '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border"
            >
              <ChevronUp size={14} className="text-muted-foreground rotate-180" />
            </button>

            {/* Track Name */}
            <div className="flex items-center gap-2 mb-3">
              <MusicIcon 
                size={14} 
                className="flex-shrink-0"
                style={{ color: `hsl(${themeConfig.primary})` }}
              />
              <p className="text-xs truncate text-foreground/80">
                {currentTrackName || 'Sem música'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <motion.button
                onClick={skipToPreviousTrack}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted"
              >
                <SkipBack size={14} className="text-muted-foreground" />
              </motion.button>

              <motion.button
                onClick={toggleMusic}
                whileTap={{ scale: 0.95 }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center relative
                  ${isMusicPlaying 
                    ? 'bg-primary/20 border-2 border-primary/60' 
                    : 'bg-muted/50 border-2 border-border/50'
                  }
                `}
              >
                {isMusicPlaying ? (
                  <Pause size={16} style={{ color: `hsl(${themeConfig.primary})` }} />
                ) : (
                  <Play size={16} className="text-muted-foreground ml-0.5" />
                )}
              </motion.button>

              <motion.button
                onClick={skipToNextTrack}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted"
              >
                <SkipForward size={14} className="text-muted-foreground" />
              </motion.button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2">
              {musicVolume === 0 ? (
                <VolumeX size={12} className="text-muted-foreground flex-shrink-0" />
              ) : (
                <Volume1 size={12} className="text-muted-foreground flex-shrink-0" />
              )}
              <Slider
                value={[volumePercent]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-6 text-right">
                {volumePercent}%
              </span>
            </div>
          </motion.div>
        ) : (
          // Compact Player - Just a floating button
          <motion.button
            key="compact"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsExpanded(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center relative
              bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg
              ${isMusicPlaying ? 'border-primary/50' : ''}
            `}
            style={{
              boxShadow: isMusicPlaying 
                ? `0 4px 20px hsl(${themeConfig.primary} / 0.4)` 
                : '0 4px 20px rgba(0,0,0,0.2)'
            }}
          >
            <AnimatePresence mode="wait">
              {isMusicPlaying ? (
                <motion.div
                  key="playing"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="relative"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <PauseIcon 
                      size={20} 
                      style={{ color: `hsl(${themeConfig.primary})` }}
                    />
                  </motion.div>
                  
                  {/* Pulse ring */}
                  <motion.div
                    className="absolute inset-0 -m-3 rounded-full border-2"
                    style={{ borderColor: `hsl(${themeConfig.primary} / 0.3)` }}
                    animate={{ 
                      scale: [1, 1.5],
                      opacity: [0.5, 0]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="paused"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <PlayIcon size={20} className="text-muted-foreground ml-0.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MiniMusicPlayer;
