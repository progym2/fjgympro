import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, VolumeX, Volume1, SkipForward, SkipBack, Play, Pause,
  Music, Flame, Waves, TreePine, Zap, Sparkles, Heart, Disc
} from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { Slider } from '@/components/ui/slider';

// Configuração de estilos por tema
const themeStyles: Record<SportTheme, {
  gradient: string;
  glow: string;
  accent: string;
  bg: string;
  icon: typeof Play;
}> = {
  fire: { gradient: 'from-orange-500 to-red-500', glow: 'shadow-orange-500/50', accent: 'text-orange-400', bg: 'bg-orange-500/20', icon: Flame },
  ocean: { gradient: 'from-blue-400 to-cyan-500', glow: 'shadow-cyan-500/50', accent: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: Waves },
  forest: { gradient: 'from-green-500 to-emerald-500', glow: 'shadow-green-500/50', accent: 'text-green-400', bg: 'bg-green-500/20', icon: TreePine },
  lightning: { gradient: 'from-yellow-400 to-amber-500', glow: 'shadow-yellow-500/50', accent: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Zap },
  galaxy: { gradient: 'from-purple-500 to-violet-500', glow: 'shadow-purple-500/50', accent: 'text-purple-400', bg: 'bg-purple-500/20', icon: Sparkles },
  iron: { gradient: 'from-slate-400 to-zinc-500', glow: 'shadow-slate-500/50', accent: 'text-slate-300', bg: 'bg-slate-500/20', icon: Disc },
  blood: { gradient: 'from-red-600 to-rose-500', glow: 'shadow-red-500/50', accent: 'text-red-400', bg: 'bg-red-500/20', icon: Heart },
  neon: { gradient: 'from-pink-500 to-fuchsia-500', glow: 'shadow-pink-500/50', accent: 'text-pink-400', bg: 'bg-pink-500/20', icon: Sparkles },
  gold: { gradient: 'from-yellow-500 to-amber-500', glow: 'shadow-yellow-500/50', accent: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Music },
  amoled: { gradient: 'from-white to-gray-300', glow: 'shadow-white/30', accent: 'text-white', bg: 'bg-white/10', icon: Music },
};

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
  
  const { currentTheme } = useTheme();
  const [showVolume, setShowVolume] = useState(false);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const style = themeStyles[currentTheme] || themeStyles.fire;
  const ThemeIcon = style.icon;

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setNeedsMarquee(textWidth > containerWidth);
    }
  }, [currentTrackName, showVolume]);

  if (!isOnHomeScreen) {
    return null;
  }

  const volumePercent = Math.round((musicVolume / 0.5) * 100);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = (value[0] / 100) * 0.5;
    setMusicVolume(newVolume);
  };

  return (
    <div className="fixed bottom-12 right-3 z-40 flex flex-col items-end gap-1.5">
      {/* Volume Slider & Track Info - Compact */}
      <AnimatePresence>
        {showVolume && isMusicEnabled && (
          <motion.div
            initial={{ opacity: 0, x: 15, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 15, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`relative overflow-hidden bg-card/90 backdrop-blur-lg border border-primary/30 rounded-xl p-2.5 shadow-lg ${style.glow}`}
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-10`} />
            
            {/* Track Name - Compact */}
            {isMusicPlaying && currentTrackName && (
              <div 
                ref={containerRef}
                className="relative max-w-[140px] overflow-hidden mb-2"
              >
                <motion.div
                  className={`w-4 h-4 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center inline-block mr-1.5 align-middle`}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <ThemeIcon size={8} className="text-white" />
                </motion.div>
                <p 
                  ref={textRef}
                  className={`inline text-[10px] font-medium ${style.accent} ${needsMarquee ? 'animate-marquee' : ''}`}
                  style={needsMarquee ? { animation: 'marquee 8s linear infinite' } : undefined}
                >
                  {currentTrackName}
                </p>
              </div>
            )}
            
            {/* Volume Slider - Compact */}
            <div className="relative flex items-center gap-2 min-w-[120px]">
              <Volume1 size={12} className={`flex-shrink-0 ${style.accent}`} />
              <Slider
                value={[volumePercent]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className={`text-[10px] font-bold ${style.accent} min-w-[28px] text-right`}>
                {volumePercent}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Row - Compact */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <AnimatePresence>
          {isMusicEnabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.15 }}
              onClick={skipToPreviousTrack}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`w-7 h-7 rounded-full ${style.bg} backdrop-blur-md border border-primary/30 
                flex items-center justify-center shadow-md hover:border-primary/50 transition-all`}
            >
              <SkipBack className={style.accent} size={11} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Toggle Button - Smaller */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, delay: 0.3 }}
          onClick={toggleMusic}
          onContextMenu={(e) => {
            e.preventDefault();
            if (isMusicEnabled) setShowVolume(!showVolume);
          }}
          onDoubleClick={() => {
            if (isMusicEnabled) setShowVolume(!showVolume);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`
            relative w-9 h-9 rounded-full 
            flex items-center justify-center 
            transition-all duration-200
            ${isMusicEnabled 
              ? `bg-gradient-to-br ${style.gradient} shadow-lg ${style.glow}` 
              : 'bg-card/80 backdrop-blur-md border border-border/40 shadow-md'
            }
          `}
        >
          {/* Animated rings - smaller */}
          {isMusicPlaying && (
            <motion.div
              className="absolute inset-0 rounded-full border border-white/30"
              animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          
          <AnimatePresence mode="wait">
            <motion.div
              key={isMusicEnabled ? 'enabled' : 'disabled'}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.15 }}
            >
              {isMusicPlaying ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ThemeIcon size={14} className="text-white drop-shadow" />
                </motion.div>
              ) : isMusicEnabled ? (
                <Pause size={13} className="text-white drop-shadow" />
              ) : (
                <VolumeX className="text-muted-foreground" size={13} />
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
              transition={{ duration: 0.15 }}
              onClick={skipToNextTrack}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`w-7 h-7 rounded-full ${style.bg} backdrop-blur-md border border-primary/30 
                flex items-center justify-center shadow-md hover:border-primary/50 transition-all`}
            >
              <SkipForward className={style.accent} size={11} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

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
    </div>
  );
};

export default MusicToggle;