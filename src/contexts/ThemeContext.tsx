import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Flame, Waves, TreePine, Zap, Sparkles, Dumbbell, Heart, 
  Rocket, Trophy, Star, Target, Crown, Shield, Sword, Gem,
  LucideIcon
} from 'lucide-react';

export type SportTheme = 
  | 'fire'      // Laranja/Vermelho - Fogo (padrão)
  | 'ocean'     // Azul - Oceano
  | 'forest'    // Verde - Floresta
  | 'lightning' // Amarelo - Raio
  | 'galaxy'    // Roxo - Galáxia
  | 'iron'      // Cinza/Prata - Ferro
  | 'blood'     // Vermelho escuro - Sangue
  | 'neon'      // Rosa neon - Neon
  | 'gold';     // Dourado - Ouro

export type CardStyle = 'rounded' | 'sharp' | 'hexagonal' | 'beveled' | 'organic';
export type IconStyle = 'filled' | 'outlined' | 'duotone' | 'glow';
export type LayoutStyle = 'grid' | 'list' | 'masonry' | 'cards';

interface ThemeConfig {
  id: SportTheme;
  name: string;
  emoji: string;
  primary: string;
  accent: string;
  gradient: string;
  // Extended design properties
  icons: {
    main: LucideIcon;
    secondary: LucideIcon;
    accent: LucideIcon;
    style: IconStyle;
  };
  cardStyle: CardStyle;
  borderRadius: string;
  buttonShape: 'rounded' | 'pill' | 'sharp' | 'hexagon';
  glowIntensity: 'low' | 'medium' | 'high' | 'extreme';
  pattern: 'none' | 'dots' | 'lines' | 'grid' | 'waves' | 'circuit';
  animationSpeed: 'slow' | 'normal' | 'fast';
  fontWeight: 'normal' | 'bold' | 'extra-bold';
}

export const SPORT_THEMES: ThemeConfig[] = [
  { 
    id: 'fire', 
    name: 'Fogo', 
    emoji: '🔥', 
    primary: '24 100% 50%', 
    accent: '15 100% 45%', 
    gradient: 'from-orange-500 to-red-600',
    icons: { main: Flame, secondary: Target, accent: Rocket, style: 'filled' },
    cardStyle: 'sharp',
    borderRadius: '0.5rem',
    buttonShape: 'sharp',
    glowIntensity: 'low',
    pattern: 'lines',
    animationSpeed: 'normal',
    fontWeight: 'bold'
  },
  { 
    id: 'ocean', 
    name: 'Oceano', 
    emoji: '🌊', 
    primary: '200 100% 50%', 
    accent: '210 100% 45%', 
    gradient: 'from-cyan-500 to-blue-600',
    icons: { main: Waves, secondary: Shield, accent: Gem, style: 'duotone' },
    cardStyle: 'rounded',
    borderRadius: '1rem',
    buttonShape: 'rounded',
    glowIntensity: 'medium',
    pattern: 'waves',
    animationSpeed: 'normal',
    fontWeight: 'normal'
  },
  { 
    id: 'forest', 
    name: 'Floresta', 
    emoji: '🌲', 
    primary: '142 76% 36%', 
    accent: '160 84% 39%', 
    gradient: 'from-green-500 to-emerald-600',
    icons: { main: TreePine, secondary: Heart, accent: Shield, style: 'filled' },
    cardStyle: 'organic',
    borderRadius: '1rem',
    buttonShape: 'rounded',
    glowIntensity: 'low',
    pattern: 'dots',
    animationSpeed: 'slow',
    fontWeight: 'normal'
  },
  { 
    id: 'lightning', 
    name: 'Raio', 
    emoji: '⚡', 
    primary: '48 100% 50%', 
    accent: '45 100% 45%', 
    gradient: 'from-yellow-400 to-amber-500',
    icons: { main: Zap, secondary: Rocket, accent: Star, style: 'outlined' },
    cardStyle: 'sharp',
    borderRadius: '0.5rem',
    buttonShape: 'sharp',
    glowIntensity: 'low',
    pattern: 'circuit',
    animationSpeed: 'fast',
    fontWeight: 'bold'
  },
  { 
    id: 'galaxy', 
    name: 'Galáxia', 
    emoji: '🌌', 
    primary: '270 100% 60%', 
    accent: '280 100% 50%', 
    gradient: 'from-purple-500 to-violet-600',
    icons: { main: Sparkles, secondary: Star, accent: Gem, style: 'duotone' },
    cardStyle: 'beveled',
    borderRadius: '0.75rem',
    buttonShape: 'rounded',
    glowIntensity: 'medium',
    pattern: 'dots',
    animationSpeed: 'normal',
    fontWeight: 'normal'
  },
  { 
    id: 'iron', 
    name: 'Ferro', 
    emoji: '🏋️', 
    primary: '220 10% 50%', 
    accent: '220 15% 40%', 
    gradient: 'from-slate-400 to-zinc-600',
    icons: { main: Dumbbell, secondary: Shield, accent: Sword, style: 'outlined' },
    cardStyle: 'sharp',
    borderRadius: '0.25rem',
    buttonShape: 'sharp',
    glowIntensity: 'low',
    pattern: 'grid',
    animationSpeed: 'normal',
    fontWeight: 'bold'
  },
  { 
    id: 'blood', 
    name: 'Sangue', 
    emoji: '💪', 
    primary: '0 84% 40%', 
    accent: '0 90% 35%', 
    gradient: 'from-red-600 to-rose-800',
    icons: { main: Heart, secondary: Flame, accent: Sword, style: 'filled' },
    cardStyle: 'sharp',
    borderRadius: '0.5rem',
    buttonShape: 'sharp',
    glowIntensity: 'medium',
    pattern: 'lines',
    animationSpeed: 'normal',
    fontWeight: 'bold'
  },
  { 
    id: 'neon', 
    name: 'Neon', 
    emoji: '💜', 
    primary: '320 100% 60%', 
    accent: '340 100% 50%', 
    gradient: 'from-pink-500 to-fuchsia-600',
    icons: { main: Sparkles, secondary: Rocket, accent: Star, style: 'duotone' },
    cardStyle: 'beveled',
    borderRadius: '1rem',
    buttonShape: 'rounded',
    glowIntensity: 'low',
    pattern: 'none',
    animationSpeed: 'normal',
    fontWeight: 'normal'
  },
  { 
    id: 'gold', 
    name: 'Ouro', 
    emoji: '🏆', 
    primary: '45 100% 45%', 
    accent: '38 100% 40%', 
    gradient: 'from-yellow-500 to-orange-500',
    icons: { main: Trophy, secondary: Crown, accent: Star, style: 'filled' },
    cardStyle: 'beveled',
    borderRadius: '0.75rem',
    buttonShape: 'rounded',
    glowIntensity: 'medium',
    pattern: 'none',
    animationSpeed: 'normal',
    fontWeight: 'normal'
  },
];

interface ThemeContextType {
  currentTheme: SportTheme;
  setTheme: (theme: SportTheme) => void;
  themes: ThemeConfig[];
  getThemeConfig: (theme: SportTheme) => ThemeConfig;
  globalTheme: SportTheme | null;
  isGlobalThemeActive: boolean;
  themeConfig: ThemeConfig;
  hoverEffectsEnabled: boolean;
  setHoverEffectsEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'francgym_sport_theme';
const GLOBAL_THEME_KEY = 'francgym_global_theme';
const HOVER_EFFECTS_KEY = 'francgym_hover_effects';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, role } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<SportTheme>('fire');
  const [globalTheme, setGlobalTheme] = useState<SportTheme | null>(null);
  const [hoverEffectsEnabled, setHoverEffectsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(HOVER_EFFECTS_KEY);
    return saved !== 'false';
  });

  // Carregar tema global do localStorage
  useEffect(() => {
    const loadGlobalTheme = () => {
      const savedGlobal = localStorage.getItem(GLOBAL_THEME_KEY);
      if (savedGlobal) {
        try {
          const parsed = JSON.parse(savedGlobal);
          if (parsed.theme && parsed.expiresAt > Date.now()) {
            setGlobalTheme(parsed.theme as SportTheme);
          } else {
            localStorage.removeItem(GLOBAL_THEME_KEY);
            setGlobalTheme(null);
          }
        } catch {
          setGlobalTheme(null);
        }
      }
    };

    loadGlobalTheme();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === GLOBAL_THEME_KEY) {
        loadGlobalTheme();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Carregar tema do usuário do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as SportTheme;
    if (savedTheme && SPORT_THEMES.find(t => t.id === savedTheme)) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  const activeTheme = globalTheme || currentTheme;
  const themeConfig = SPORT_THEMES.find(t => t.id === activeTheme) || SPORT_THEMES[0];

  // Aplicar tema
  useEffect(() => {
    const root = document.documentElement;
    
    // Clear all theme classes
    SPORT_THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${activeTheme}`);
    
    // Apply CSS variables
    root.style.setProperty('--primary', themeConfig.primary);
    root.style.setProperty('--accent', themeConfig.accent);
    root.style.setProperty('--ring', themeConfig.primary);
    root.style.setProperty('--sidebar-primary', themeConfig.primary);
    root.style.setProperty('--sidebar-ring', themeConfig.primary);
    
    // Extended theme variables
    root.style.setProperty('--theme-border-radius', themeConfig.borderRadius);
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${themeConfig.primary}) 0%, hsl(${themeConfig.accent}) 100%)`);
    root.style.setProperty('--shadow-glow', `0 0 60px hsl(${themeConfig.primary} / 0.3)`);
    root.style.setProperty('--shadow-button', `0 10px 30px -5px hsl(${themeConfig.primary} / 0.4)`);
    
    // Glow intensity
    const glowMap = { low: '0.15', medium: '0.25', high: '0.4', extreme: '0.6' };
    root.style.setProperty('--theme-glow-intensity', glowMap[themeConfig.glowIntensity]);
    
    // Animation speed
    const speedMap = { slow: '0.5s', normal: '0.3s', fast: '0.15s' };
    root.style.setProperty('--theme-animation-speed', speedMap[themeConfig.animationSpeed]);
    
    // Card style classes
    root.setAttribute('data-card-style', themeConfig.cardStyle);
    root.setAttribute('data-button-shape', themeConfig.buttonShape);
    root.setAttribute('data-pattern', themeConfig.pattern);
    root.setAttribute('data-font-weight', themeConfig.fontWeight);
    
  }, [activeTheme, themeConfig]);

  const setTheme = (theme: SportTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  };

  const setHoverEffectsEnabled = (enabled: boolean) => {
    setHoverEffectsEnabledState(enabled);
    localStorage.setItem(HOVER_EFFECTS_KEY, String(enabled));
    document.documentElement.setAttribute('data-hover-effects', String(enabled));
  };

  // Aplicar hover effects no mount
  useEffect(() => {
    document.documentElement.setAttribute('data-hover-effects', String(hoverEffectsEnabled));
  }, [hoverEffectsEnabled]);

  const getThemeConfig = (theme: SportTheme): ThemeConfig => {
    return SPORT_THEMES.find(t => t.id === theme) || SPORT_THEMES[0];
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme: activeTheme,
      setTheme,
      themes: SPORT_THEMES,
      getThemeConfig,
      globalTheme,
      isGlobalThemeActive: !!globalTheme,
      themeConfig,
      hoverEffectsEnabled,
      setHoverEffectsEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility functions for master global theme management
export const setGlobalTheme = (theme: SportTheme | null) => {
  if (theme) {
    const data = {
      theme,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
      setAt: Date.now(),
    };
    localStorage.setItem(GLOBAL_THEME_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(GLOBAL_THEME_KEY);
  }
  window.dispatchEvent(new StorageEvent('storage', { key: GLOBAL_THEME_KEY }));
  window.location.reload();
};

export const getGlobalTheme = (): SportTheme | null => {
  const saved = localStorage.getItem(GLOBAL_THEME_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.theme && parsed.expiresAt > Date.now()) {
        return parsed.theme as SportTheme;
      }
    } catch {
      return null;
    }
  }
  return null;
};
