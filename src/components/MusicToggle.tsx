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
    <div className="fixed bottom-14 right-4 z-40 flex flex-col items-end gap-2">
      {/* Volume Slider & Track Info */}
      <AnimatePresence>
        {showVolume && isMusicEnabled && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`relative overflow-hidden bg-card/95 backdrop-blur-xl border-2 border-primary/40 rounded-2xl p-4 shadow-xl ${style.glow}`}
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-10`} />
            
            {/* Track Name with Marquee */}
            {isMusicPlaying && currentTrackName && (
              <div 
                ref={containerRef}
                className="relative max-w-[180px] overflow-hidden mb-3"
              >
                <motion.div
                  className={`w-6 h-6 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center inline-block mr-2 align-middle`}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <ThemeIcon size={12} className="text-white" />
                </motion.div>
                <p 
                  ref={textRef}
                  className={`inline text-sm font-bold ${style.accent} ${needsMarquee ? 'animate-marquee' : ''}`}
                  style={needsMarquee ? { animation: 'marquee 8s linear infinite' } : undefined}
                >
                  {currentTrackName}
                </p>
              </div>
            )}
            
            {/* Volume Slider */}
            <div className="relative flex items-center gap-3 min-w-[160px]">
              <Volume1 size={16} className={`flex-shrink-0 ${style.accent}`} />
              <Slider
                value={[volumePercent]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="flex-1"
              />
              <Volume2 size={16} className={`flex-shrink-0 ${style.accent}`} />
            </div>
            <p className={`text-center text-xs font-bold mt-2 ${style.accent}`}>
              {volumePercent}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Row */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <AnimatePresence>
          {isMusicEnabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
              onClick={skipToPreviousTrack}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={`w-9 h-9 rounded-full ${style.bg} backdrop-blur-md border-2 border-primary/40 
                flex items-center justify-center shadow-lg hover:border-primary/60 transition-all`}
            >
              <SkipBack className={style.accent} size={14} />
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
            relative w-12 h-12 rounded-full 
            flex items-center justify-center 
            transition-all duration-300
            ${isMusicEnabled 
              ? `bg-gradient-to-br ${style.gradient} shadow-xl ${style.glow}` 
              : 'bg-card/80 backdrop-blur-md border-2 border-border/40 shadow-lg'
            }
          `}
        >
          {/* Animated rings */}
          {isMusicPlaying && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/40"
                animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/20"
                animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              />
            </>
          )}
          
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
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ThemeIcon size={20} className="text-white drop-shadow-lg" />
                </motion.div>
              ) : isMusicEnabled ? (
                <Pause size={18} className="text-white drop-shadow" />
              ) : (
                <VolumeX className="text-muted-foreground" size={18} />
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
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={`w-9 h-9 rounded-full ${style.bg} backdrop-blur-md border-2 border-primary/40 
                flex items-center justify-center shadow-lg hover:border-primary/60 transition-all`}
            >
              <SkipForward className={style.accent} size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      {isMusicEnabled && !showVolume && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className={`text-[10px] font-medium text-right mr-1 ${style.accent}`}
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
      `}</style>
    </div>
  );
};

export default MusicToggle;