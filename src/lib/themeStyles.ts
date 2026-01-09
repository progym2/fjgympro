import { SportTheme } from '@/contexts/ThemeContext';

export interface ThemeStyleConfig {
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  titleColor: string;
  accentColor: string;
  tipBg: string;
  tipBorder: string;
  tipText: string;
  highlightBg: string;
  highlightText: string;
  iconBg: string;
  iconColor: string;
  glowColor: string;
  inputBg: string;
  inputBorder: string;
  tabsBg: string;
  tabsActiveBg: string;
  tabsActiveText: string;
}

export const getThemeStyles = (themeId: SportTheme): ThemeStyleConfig => {
  const styles: Record<SportTheme, ThemeStyleConfig> = {
    fire: {
      cardBg: 'bg-black/70',
      cardBorder: 'border-orange-500/40',
      cardHoverBorder: 'hover:border-orange-500/60',
      titleColor: 'text-orange-500',
      accentColor: 'text-orange-400',
      tipBg: 'bg-orange-500/10',
      tipBorder: 'border-orange-500/30',
      tipText: 'text-orange-400',
      highlightBg: 'bg-orange-500/30',
      highlightText: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-500',
      glowColor: 'rgba(249, 115, 22, 0.3)',
      inputBg: 'bg-black/50',
      inputBorder: 'border-orange-500/30',
      tabsBg: 'bg-black/60',
      tabsActiveBg: 'bg-orange-500/20',
      tabsActiveText: 'text-orange-400',
    },
    ocean: {
      cardBg: 'bg-slate-950/80',
      cardBorder: 'border-cyan-500/40',
      cardHoverBorder: 'hover:border-cyan-500/60',
      titleColor: 'text-cyan-400',
      accentColor: 'text-cyan-300',
      tipBg: 'bg-cyan-500/10',
      tipBorder: 'border-cyan-500/30',
      tipText: 'text-cyan-300',
      highlightBg: 'bg-cyan-500/30',
      highlightText: 'text-cyan-300',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      inputBg: 'bg-slate-950/50',
      inputBorder: 'border-cyan-500/30',
      tabsBg: 'bg-slate-950/60',
      tabsActiveBg: 'bg-cyan-500/20',
      tabsActiveText: 'text-cyan-300',
    },
    forest: {
      cardBg: 'bg-emerald-950/80',
      cardBorder: 'border-green-500/40',
      cardHoverBorder: 'hover:border-green-500/60',
      titleColor: 'text-green-400',
      accentColor: 'text-green-300',
      tipBg: 'bg-green-500/10',
      tipBorder: 'border-green-500/30',
      tipText: 'text-green-300',
      highlightBg: 'bg-green-500/30',
      highlightText: 'text-green-300',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      glowColor: 'rgba(34, 197, 94, 0.3)',
      inputBg: 'bg-emerald-950/50',
      inputBorder: 'border-green-500/30',
      tabsBg: 'bg-emerald-950/60',
      tabsActiveBg: 'bg-green-500/20',
      tabsActiveText: 'text-green-300',
    },
    lightning: {
      cardBg: 'bg-black/80',
      cardBorder: 'border-amber-500/50',
      cardHoverBorder: 'hover:border-amber-500/70',
      titleColor: 'text-amber-400',
      accentColor: 'text-amber-300',
      tipBg: 'bg-amber-500/15',
      tipBorder: 'border-amber-500/40',
      tipText: 'text-amber-300',
      highlightBg: 'bg-amber-500/30',
      highlightText: 'text-amber-300',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      inputBg: 'bg-black/50',
      inputBorder: 'border-amber-500/40',
      tabsBg: 'bg-black/60',
      tabsActiveBg: 'bg-amber-500/20',
      tabsActiveText: 'text-amber-300',
    },
    galaxy: {
      cardBg: 'bg-violet-950/80',
      cardBorder: 'border-purple-500/40',
      cardHoverBorder: 'hover:border-purple-500/60',
      titleColor: 'text-purple-400',
      accentColor: 'text-purple-300',
      tipBg: 'bg-purple-500/10',
      tipBorder: 'border-purple-500/30',
      tipText: 'text-purple-300',
      highlightBg: 'bg-purple-500/30',
      highlightText: 'text-purple-300',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      glowColor: 'rgba(168, 85, 247, 0.3)',
      inputBg: 'bg-violet-950/50',
      inputBorder: 'border-purple-500/30',
      tabsBg: 'bg-violet-950/60',
      tabsActiveBg: 'bg-purple-500/20',
      tabsActiveText: 'text-purple-300',
    },
    iron: {
      cardBg: 'bg-black/85',
      cardBorder: 'border-zinc-500/50',
      cardHoverBorder: 'hover:border-zinc-400/70',
      titleColor: 'text-white',
      accentColor: 'text-zinc-200',
      tipBg: 'bg-zinc-700/30',
      tipBorder: 'border-zinc-500/40',
      tipText: 'text-zinc-200',
      highlightBg: 'bg-zinc-500/30',
      highlightText: 'text-white',
      iconBg: 'bg-zinc-700/30',
      iconColor: 'text-white',
      glowColor: 'rgba(161, 161, 170, 0.25)',
      inputBg: 'bg-black/50',
      inputBorder: 'border-zinc-500/40',
      tabsBg: 'bg-black/60',
      tabsActiveBg: 'bg-zinc-600/30',
      tabsActiveText: 'text-white',
    },
    blood: {
      cardBg: 'bg-black/80',
      cardBorder: 'border-red-500/50',
      cardHoverBorder: 'hover:border-red-500/70',
      titleColor: 'text-red-400',
      accentColor: 'text-red-300',
      tipBg: 'bg-red-500/15',
      tipBorder: 'border-red-500/40',
      tipText: 'text-red-300',
      highlightBg: 'bg-red-500/30',
      highlightText: 'text-red-300',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      glowColor: 'rgba(220, 38, 38, 0.3)',
      inputBg: 'bg-black/50',
      inputBorder: 'border-red-500/40',
      tabsBg: 'bg-black/60',
      tabsActiveBg: 'bg-red-500/20',
      tabsActiveText: 'text-red-300',
    },
    neon: {
      cardBg: 'bg-black/85',
      cardBorder: 'border-pink-500/50',
      cardHoverBorder: 'hover:border-pink-500/70',
      titleColor: 'text-pink-400',
      accentColor: 'text-pink-300',
      tipBg: 'bg-pink-500/15',
      tipBorder: 'border-pink-500/40',
      tipText: 'text-pink-300',
      highlightBg: 'bg-pink-500/30',
      highlightText: 'text-pink-300',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
      glowColor: 'rgba(236, 72, 153, 0.35)',
      inputBg: 'bg-black/50',
      inputBorder: 'border-pink-500/40',
      tabsBg: 'bg-black/60',
      tabsActiveBg: 'bg-pink-500/20',
      tabsActiveText: 'text-pink-300',
    },
    gold: {
      cardBg: 'bg-black/85',
      cardBorder: 'border-amber-500/50',
      cardHoverBorder: 'hover:border-amber-500/70',
      titleColor: 'text-amber-400',
      accentColor: 'text-amber-300',
      tipBg: 'bg-amber-500/15',
      tipBorder: 'border-amber-500/40',
      tipText: 'text-amber-300',
      highlightBg: 'bg-amber-500/30',
      highlightText: 'text-amber-300',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      inputBg: 'bg-black/50',
      inputBorder: 'border-amber-500/40',
      tabsBg: 'bg-black/60',
      tabsActiveBg: 'bg-amber-500/20',
      tabsActiveText: 'text-amber-300',
    },
    amoled: {
      cardBg: 'bg-black/95',
      cardBorder: 'border-white/30',
      cardHoverBorder: 'hover:border-white/50',
      titleColor: 'text-white',
      accentColor: 'text-white/80',
      tipBg: 'bg-white/10',
      tipBorder: 'border-white/20',
      tipText: 'text-white/80',
      highlightBg: 'bg-white/20',
      highlightText: 'text-white',
      iconBg: 'bg-white/15',
      iconColor: 'text-white',
      glowColor: 'rgba(255, 255, 255, 0.15)',
      inputBg: 'bg-black/70',
      inputBorder: 'border-white/20',
      tabsBg: 'bg-black/80',
      tabsActiveBg: 'bg-white/15',
      tabsActiveText: 'text-white',
    },
  };
  return styles[themeId] || styles.fire;
};

// Hook para usar os estilos de tema
import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const useThemeStyles = () => {
  const { currentTheme } = useTheme();
  return useMemo(() => getThemeStyles(currentTheme), [currentTheme]);
};
