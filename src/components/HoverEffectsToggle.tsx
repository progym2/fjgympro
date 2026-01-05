import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const HoverEffectsToggle: React.FC = () => {
  const { hoverEffectsEnabled, setHoverEffectsEnabled } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={() => setHoverEffectsEnabled(!hoverEffectsEnabled)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
              fixed bottom-4 left-4 z-40
              w-8 h-8 rounded-full
              flex items-center justify-center
              backdrop-blur-sm border
              transition-all duration-300
              ${hoverEffectsEnabled 
                ? 'bg-primary/20 border-primary/30 text-primary' 
                : 'bg-muted/50 border-muted-foreground/20 text-muted-foreground'
              }
              hover:bg-primary/30 hover:border-primary/50
              shadow-sm
            `}
            aria-label={hoverEffectsEnabled ? 'Desativar efeitos de hover' : 'Ativar efeitos de hover'}
          >
            {hoverEffectsEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 opacity-50" />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {hoverEffectsEnabled ? 'Som e efeitos: ON' : 'Som e efeitos: OFF'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HoverEffectsToggle;
