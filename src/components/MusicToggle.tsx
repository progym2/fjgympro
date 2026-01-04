import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

const MusicToggle: React.FC = () => {
  const { isMusicPlaying, isMusicEnabled, isOnHomeScreen, toggleMusic } = useAudio();

  // Só mostrar na tela inicial
  if (!isOnHomeScreen) {
    return null;
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      onClick={toggleMusic}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`
        fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full 
        backdrop-blur-md border flex items-center justify-center 
        shadow-lg transition-all duration-300
        ${isMusicEnabled 
          ? 'bg-primary/20 border-primary/40 shadow-primary/20' 
          : 'bg-card/60 border-border/30 shadow-black/20'
        }
      `}
      aria-label={isMusicEnabled ? 'Desativar música' : 'Ativar música'}
      title={isMusicEnabled ? 'Desativar música de fundo' : 'Ativar música de fundo'}
    >
      <AnimatePresence mode="wait">
        {isMusicEnabled ? (
          <motion.div
            key="playing"
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
                <Volume2 className="text-primary" size={20} />
              </motion.div>
            ) : (
              <Volume2 className="text-primary/70" size={20} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="muted"
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -180 }}
            transition={{ duration: 0.2 }}
          >
            <VolumeX className="text-muted-foreground" size={20} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default MusicToggle;
