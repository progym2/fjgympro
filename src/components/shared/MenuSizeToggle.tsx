import React from 'react';
import { useTheme, MenuSizeMode } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAudio } from '@/contexts/AudioContext';

interface MenuSizeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const MenuSizeToggle: React.FC<MenuSizeToggleProps> = ({ className, showLabel = false }) => {
  const { menuSize, setMenuSize } = useTheme();
  const { playClickSound } = useAudio();

  const toggleSize = () => {
    playClickSound();
    setMenuSize(menuSize === 'large' ? 'compact' : 'large');
  };

  const isLarge = menuSize === 'large';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={toggleSize}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'p-1.5 sm:p-2 rounded-lg transition-all duration-200',
            'bg-background/50 border border-border hover:border-primary/50',
            'flex items-center gap-1.5',
            className
          )}
          aria-label={isLarge ? 'Mudar para menu compacto' : 'Mudar para menu grande'}
        >
          {isLarge ? (
            <Minimize2 size={14} className="text-muted-foreground" />
          ) : (
            <Maximize2 size={14} className="text-primary" />
          )}
          {showLabel && (
            <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground hidden sm:inline">
              {isLarge ? 'Compactar' : 'Expandir'}
            </span>
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">
          {isLarge ? 'Menu compacto' : 'Menu grande'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default MenuSizeToggle;
