import React, { useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/contexts/AudioContext';

const BAR_COUNT = 24;
const MIN_HEIGHT = 2;
const MAX_HEIGHT = 28;

const AudioVisualizer = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMusicPlaying, analyserNode, isOnHomeScreen } = useAudio();
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isMusicPlaying || !analyserNode || !isOnHomeScreen) {
      // Resetar barras quando não está tocando
      barsRef.current.forEach(bar => {
        if (bar) bar.style.height = `${MIN_HEIGHT}px`;
      });
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Distribuir as frequências pelas barras
      const step = Math.floor(bufferLength / BAR_COUNT);
      
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        
        // Média das frequências para esta barra
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        const average = sum / step;
        
        // Mapear para altura (0-255 -> MIN_HEIGHT-MAX_HEIGHT)
        const height = MIN_HEIGHT + (average / 255) * (MAX_HEIGHT - MIN_HEIGHT);
        bar.style.height = `${height}px`;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, analyserNode, isOnHomeScreen]);

  if (!isOnHomeScreen) return null;

  return (
    <AnimatePresence>
      {isMusicPlaying && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-30 flex items-end justify-center gap-[2px] h-10 pb-2 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background) / 0.8), transparent)',
          }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <div
              key={i}
              ref={el => barsRef.current[i] = el}
              className="rounded-t-sm transition-all duration-75"
              style={{
                width: '6px',
                minHeight: `${MIN_HEIGHT}px`,
                background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.5))`,
                boxShadow: '0 0 8px hsl(var(--primary) / 0.4)',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AudioVisualizer.displayName = 'AudioVisualizer';

export default AudioVisualizer;
