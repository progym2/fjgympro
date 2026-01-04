import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Lock, Check, Zap } from 'lucide-react';
import { useTheme, SPORT_THEMES, SportTheme } from '@/contexts/ThemeContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SportThemeSelectorProps {
  compact?: boolean;
}

const SportThemeSelector: React.FC<SportThemeSelectorProps> = ({ compact = false }) => {
  const { currentTheme, setTheme, themes, isGlobalThemeActive, getThemeConfig, themeConfig } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentConfig = getThemeConfig(currentTheme);

  const handleThemeSelect = (theme: SportTheme) => {
    if (isGlobalThemeActive || theme === currentTheme) return;
    setTheme(theme);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-background/60 border border-border/40 hover:border-primary/50 transition-all backdrop-blur-sm"
          aria-label="Escolher tema"
        >
          <Zap className="w-4 h-4 text-primary" />
          {isGlobalThemeActive && (
            <Lock className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
          )}
        </motion.button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[280px] p-3 bg-card/95 backdrop-blur-xl border-border/50 z-[100]" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5 font-bebas tracking-wider">
              <Palette size={12} className="text-primary" />
              TEMAS
            </p>
            {isGlobalThemeActive && (
              <span className="text-[10px] text-yellow-500 flex items-center gap-1">
                <Lock size={8} />
                Fixado
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-1.5">
            {themes.map((theme) => (
              <motion.button
                key={theme.id}
                whileHover={{ scale: isGlobalThemeActive ? 1 : 1.05 }}
                whileTap={{ scale: isGlobalThemeActive ? 1 : 0.95 }}
                onClick={() => handleThemeSelect(theme.id)}
                disabled={isGlobalThemeActive}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  currentTheme === theme.id
                    ? 'border-primary bg-primary/20 ring-1 ring-primary/40'
                    : isGlobalThemeActive
                    ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                    : 'border-border/40 hover:border-primary/40 hover:bg-muted/20'
                }`}
              >
                <span className="text-lg">{theme.emoji}</span>
                <span className="text-[10px] font-bold font-bebas tracking-wide truncate w-full text-center">
                  {theme.name.toUpperCase()}
                </span>
                
                {currentTheme === theme.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-2 h-2 text-primary-foreground" />
                  </motion.div>
                )}
                
                {/* Mini gradient bar */}
                <div className={`w-full h-1 rounded-full bg-gradient-to-r ${theme.gradient}`} />
              </motion.button>
            ))}
          </div>
          
          {!isGlobalThemeActive && (
            <p className="text-[10px] text-muted-foreground text-center">
              Salvo automaticamente
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SportThemeSelector;