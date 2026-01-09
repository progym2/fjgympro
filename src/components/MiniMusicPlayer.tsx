import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, VolumeX, Volume1, SkipForward, SkipBack, Play, Pause,
  Music, Radio, Headphones, Disc, Disc3, Music2, Music4,
  Flame, Waves, TreePine, Zap, Sparkles, Heart, ChevronUp, ChevronDown
} from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { Slider } from '@/components/ui/slider';

// Configuração de cores por tema
const themePlayerStyles: Record<SportTheme, {
  gradient: string;
  glow: string;
  accent: string;
  bg: string;
  icon: typeof Play;
}> = {
  fire: { 
    gradient: 'from-orange-500 via-red-500 to-amber-500',
    glow: 'shadow-orange-500/50',
    accent: 'text-orange-400',
    bg: 'bg-orange-500/20',
    icon: Flame
  },
  ocean: { 
    gradient: 'from-blue-400 via-cyan-500 to-teal-500',
    glow: 'shadow-cyan-500/50',
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    icon: Waves
  },
  forest: { 
    gradient: 'from-green-500 via-emerald-500 to-lime-500',
    glow: 'shadow-green-500/50',
    accent: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: TreePine
  },
  lightning: { 
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    glow: 'shadow-yellow-500/50',
    accent: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: Zap
  },
  galaxy: { 
    gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
    glow: 'shadow-purple-500/50',
    accent: 'text-purple-400',
    bg: 'bg-purple-500/20',
    icon: Sparkles
  },
  iron: { 
    gradient: 'from-slate-400 via-zinc-500 to-gray-600',
    glow: 'shadow-slate-500/50',
    accent: 'text-slate-300',
    bg: 'bg-slate-500/20',
    icon: Disc
  },
  blood: { 
    gradient: 'from-red-600 via-rose-500 to-pink-500',
    glow: 'shadow-red-500/50',
    accent: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: Heart
  },
  neon: { 
    gradient: 'from-pink-500 via-fuchsia-500 to-cyan-500',
    glow: 'shadow-pink-500/50',
    accent: 'text-pink-400',
    bg: 'bg-pink-500/20',
    icon: Sparkles
  },
  gold: { 
    gradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    glow: 'shadow-yellow-500/50',
    accent: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: Music
  },
  amoled: { 
    gradient: 'from-white via-gray-300 to-gray-400',
    glow: 'shadow-white/30',
    accent: 'text-white',
    bg: 'bg-white/10',
    icon: Headphones
  },
};

const MiniMusicPlayer = React.forwardRef<HTMLDivElement>((_, ref) => {
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

  if (!isOnHomeScreen) {
    return null;
  }

  const style = themePlayerStyles[currentTheme] || themePlayerStyles.fire;
  const ThemeIcon = style.icon;

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
          // Expanded Player - Redesign moderno
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={`
              relative overflow-hidden
              bg-card/95 backdrop-blur-2xl border-2 border-primary/40
              shadow-2xl ${style.glow} p-4 w-56
              ${themeConfig.buttonShape === 'pill' ? 'rounded-3xl' : 
                themeConfig.buttonShape === 'sharp' ? 'rounded-lg' : 'rounded-2xl'}
            `}
          >
            {/* Gradient background overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-10`} />
            
            {/* Animated pulse ring when playing */}
            {isMusicPlaying && (
              <motion.div
                className={`absolute inset-0 rounded-2xl border-2 border-primary/30`}
                animate={{ scale: [1, 1.02, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Close Button */}
            <motion.button
              onClick={() => setIsExpanded(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full ${style.bg} flex items-center justify-center border border-primary/30 backdrop-blur-sm`}
            >
              <ChevronDown size={14} className={style.accent} />
            </motion.button>

            {/* Theme Icon with Animation */}
            <div className="flex items-center justify-center mb-3">
              <motion.div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg ${style.glow}`}
                animate={isMusicPlaying ? { 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ 
                  rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
              >
                <ThemeIcon size={18} className="text-white drop-shadow-lg" />
              </motion.div>
            </div>

            {/* Track Name */}
            <div className="relative text-center mb-3 px-2">
              <motion.p 
                className={`text-xs font-medium truncate ${style.accent}`}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎵 {currentTrackName || 'Sem música'}
              </motion.p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.button
                onClick={skipToPreviousTrack}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${style.bg} border border-primary/30 hover:border-primary/60 transition-colors`}
              >
                <SkipBack size={14} className={style.accent} />
              </motion.button>

              <motion.button
                onClick={toggleMusic}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative w-14 h-14 rounded-full flex items-center justify-center
                  bg-gradient-to-br ${style.gradient}
                  shadow-xl ${style.glow}
                  transition-all duration-300
                `}
              >
                {/* Animated ring */}
                {isMusicPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/30"
                    animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                
                <motion.div
                  animate={isMusicPlaying ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {isMusicPlaying ? (
                    <Pause size={22} className="text-white drop-shadow-lg" />
                  ) : (
                    <Play size={22} className="text-white drop-shadow-lg ml-1" />
                  )}
                </motion.div>
              </motion.button>

              <motion.button
                onClick={skipToNextTrack}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${style.bg} border border-primary/30 hover:border-primary/60 transition-colors`}
              >
                <SkipForward size={14} className={style.accent} />
              </motion.button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-3 px-2">
              {musicVolume === 0 ? (
                <VolumeX size={14} className="text-muted-foreground flex-shrink-0" />
              ) : (
                <Volume1 size={14} className={`flex-shrink-0 ${style.accent}`} />
              )}
              <Slider
                value={[volumePercent]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className={`text-[10px] font-bold w-8 text-right ${style.accent}`}>
                {volumePercent}%
              </span>
            </div>
          </motion.div>
        ) : (
          // Compact Player - Botão flutuante com design vibrante
          <motion.button
            key="compact"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsExpanded(true)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative w-14 h-14 rounded-full flex items-center justify-center
              ${isMusicPlaying 
                ? `bg-gradient-to-br ${style.gradient} shadow-xl ${style.glow}` 
                : 'bg-card/90 backdrop-blur-xl border-2 border-border/50 shadow-lg'
              }
              transition-all duration-300
            `}
          >
            {/* Animated rings when playing */}
            {isMusicPlaying && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/30"
                  animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/20"
                  animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}

            <AnimatePresence mode="wait">
              {isMusicPlaying ? (
                <motion.div
                  key="playing"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="relative"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ThemeIcon size={24} className="text-white drop-shadow-lg" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="paused"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Play size={22} className="text-muted-foreground ml-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

MiniMusicPlayer.displayName = 'MiniMusicPlayer';

export default MiniMusicPlayer;