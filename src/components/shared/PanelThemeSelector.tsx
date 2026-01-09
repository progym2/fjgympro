import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Lock, Check, Cloud } from 'lucide-react';
import { useTheme, SPORT_THEMES, SportTheme } from '@/contexts/ThemeContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

const PanelThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, themes, isGlobalThemeActive, themeConfig, isSyncing } = useTheme();
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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg",
            "bg-card/80 border border-border/50 hover:border-primary/30",
            "transition-all backdrop-blur-sm"
          )}
          aria-label="Escolher tema esportivo"
        >
          <div 
            className="w-4 h-4 rounded-full"
            style={{ 
              background: `linear-gradient(135deg, hsl(${themeConfig.primary}), hsl(${themeConfig.accent}))` 
            }}
          />
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          
          {/* Sync indicator */}
          <AnimatePresence>
            {isSyncing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute -top-1 -right-1"
              >
                <Cloud className="w-3 h-3 text-blue-400 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {isGlobalThemeActive && (
            <Lock className="w-3 h-3 text-yellow-500" />
          )}
        </motion.button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[260px] p-3 bg-card/95 backdrop-blur-xl border-border/50 z-[100]" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">
              Tema Esportivo
            </p>
            <div className="flex items-center gap-2">
              {/* Sync status */}
              <AnimatePresence>
                {isSyncing && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-blue-400 flex items-center gap-1"
                  >
                    <Cloud size={10} className="animate-pulse" />
                    Salvando...
                  </motion.span>
                )}
              </AnimatePresence>
              
              {isGlobalThemeActive && (
                <span className="text-[10px] text-yellow-500 flex items-center gap-1">
                  <Lock size={10} />
                  Bloqueado
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {themes.map((theme) => {
              const ThemeIcon = theme.icons.main;
              const isActive = currentTheme === theme.id;
              
              return (
                <motion.button
                  key={theme.id}
                  whileHover={{ scale: isGlobalThemeActive ? 1 : 1.08 }}
                  whileTap={{ scale: isGlobalThemeActive ? 1 : 0.95 }}
                  onClick={() => handleThemeSelect(theme.id)}
                  disabled={isGlobalThemeActive}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-1.5 rounded-lg transition-all",
                    isActive
                      ? 'bg-primary/20 ring-2 ring-primary/50'
                      : isGlobalThemeActive
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-muted/50'
                  )}
                  title={theme.name}
                >
                  {/* Gradient circle with icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shadow-md",
                    `bg-gradient-to-br ${theme.gradient}`
                  )}>
                    <ThemeIcon className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  
                  {/* Check mark for active */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Current theme name with sync indicator */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                background: `linear-gradient(135deg, hsl(${themeConfig.primary}), hsl(${themeConfig.accent}))` 
              }}
            />
            <span className="text-xs text-muted-foreground">
              {themeConfig.name}
            </span>
            {isSyncing && (
              <Cloud className="w-3 h-3 text-blue-400 animate-pulse" />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PanelThemeSelector;
