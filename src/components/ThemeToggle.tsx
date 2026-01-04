import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Settings2 } from 'lucide-react';
import { useAutoNightMode } from '@/hooks/useAutoNightMode';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ThemeMode = 'light' | 'dark' | 'auto';

const ThemeToggle: React.FC = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [isOpen, setIsOpen] = useState(false);
  const { isNightMode, autoModeEnabled, setAutoModeEnabled } = useAutoNightMode({ 
    startHour: 20, 
    endHour: 6, 
    enabled: themeMode === 'auto' 
  });

  // Load saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode;
    if (saved) {
      setThemeMode(saved);
      applyTheme(saved);
    }
  }, []);

  // Apply theme changes
  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    
    if (mode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.setProperty('--theme-mode', 'light');
    } else if (mode === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.setProperty('--theme-mode', 'dark');
    } else {
      // Auto mode - handled by useAutoNightMode
      root.style.setProperty('--theme-mode', 'auto');
    }
  };

  // Handle theme mode change
  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('theme-mode', mode);
    
    if (mode === 'auto') {
      setAutoModeEnabled(true);
    } else {
      setAutoModeEnabled(false);
      applyTheme(mode);
    }
    
    setIsOpen(false);
  };

  // Apply auto mode changes
  useEffect(() => {
    if (themeMode === 'auto') {
      if (isNightMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, [themeMode, isNightMode]);

  const getCurrentIcon = () => {
    if (themeMode === 'light') return <Sun className="w-4 h-4" />;
    if (themeMode === 'dark') return <Moon className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const themes = [
    { mode: 'light' as ThemeMode, icon: <Sun className="w-4 h-4" />, label: 'Claro', description: 'Tema claro sempre' },
    { mode: 'dark' as ThemeMode, icon: <Moon className="w-4 h-4" />, label: 'Escuro', description: 'Tema escuro sempre' },
    { mode: 'auto' as ThemeMode, icon: <Monitor className="w-4 h-4" />, label: 'Automático', description: 'Escuro após 20h' },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 rounded-xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all shadow-lg backdrop-blur-md"
          aria-label="Alterar tema"
        >
          <motion.div
            key={themeMode}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {getCurrentIcon()}
          </motion.div>
        </motion.button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-56 p-2 bg-card/95 backdrop-blur-xl border-border/50" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="px-2 py-1.5 mb-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 size={12} />
              Preferência de Tema
            </p>
          </div>
          
          {themes.map((theme) => (
            <motion.button
              key={theme.mode}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleThemeChange(theme.mode)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                themeMode === theme.mode
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              <div className={`p-1.5 rounded-md ${
                themeMode === theme.mode ? 'bg-primary/20' : 'bg-muted'
              }`}>
                {theme.icon}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{theme.label}</p>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </div>
              {themeMode === theme.mode && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 rounded-full bg-primary"
                />
              )}
            </motion.button>
          ))}
        </div>
        
        {themeMode === 'auto' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 pt-2 border-t border-border/30"
          >
            <p className="text-xs text-muted-foreground text-center">
              {isNightMode ? '🌙 Modo noturno ativo' : '☀️ Modo diurno ativo'}
            </p>
          </motion.div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ThemeToggle;
