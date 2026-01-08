import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Lock, Check } from 'lucide-react';
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
  const { currentTheme, setTheme, themes, isGlobalThemeActive, themeConfig } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

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
          className="relative p-2 rounded-full bg-black/40 border border-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
          aria-label="Escolher tema"
        >
          <Palette className="w-4 h-4 text-white/80" />
          {isGlobalThemeActive && (
            <Lock className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
          )}
        </motion.button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[220px] p-2 bg-black/90 backdrop-blur-xl border-white/20 z-[100]" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
              Temas
            </p>
            {isGlobalThemeActive && (
              <span className="text-[9px] text-yellow-500 flex items-center gap-0.5">
                <Lock size={8} />
                Fixado
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-5 gap-1">
            {themes.map((theme) => {
              const ThemeIcon = theme.icons.main;
              const isActive = currentTheme === theme.id;
              
              return (
                <motion.button
                  key={theme.id}
                  whileHover={{ scale: isGlobalThemeActive ? 1 : 1.1 }}
                  whileTap={{ scale: isGlobalThemeActive ? 1 : 0.9 }}
                  onClick={() => handleThemeSelect(theme.id)}
                  disabled={isGlobalThemeActive}
                  className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/20 ring-1 ring-white/40'
                      : isGlobalThemeActive
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white/10'
                  }`}
                  title={theme.name}
                >
                  {/* Gradient circle with icon */}
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-md`}>
                    <ThemeIcon className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  </div>
                  
                  {/* Check mark for active */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center"
                    >
                      <Check className="w-2 h-2 text-black" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Current theme name */}
          <div className="text-center pt-1 border-t border-white/10">
            <span className="text-[9px] text-white/60 uppercase tracking-wider">
              {themeConfig.name}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SportThemeSelector;
