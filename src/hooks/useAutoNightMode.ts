import { useState, useEffect } from 'react';

interface AutoNightModeOptions {
  startHour?: number; // Hour when night mode starts (default: 18 = 6pm)
  endHour?: number;   // Hour when night mode ends (default: 6 = 6am)
  enabled?: boolean;  // Whether auto mode is enabled
}

export const useAutoNightMode = (options: AutoNightModeOptions = {}) => {
  const { startHour = 18, endHour = 6, enabled = true } = options;
  
  const [isNightMode, setIsNightMode] = useState(false);
  const [autoModeEnabled, setAutoModeEnabled] = useState(enabled);

  const checkNightMode = () => {
    const currentHour = new Date().getHours();
    // Night mode is active if current hour is >= startHour OR < endHour
    const isNight = currentHour >= startHour || currentHour < endHour;
    setIsNightMode(isNight);
  };

  useEffect(() => {
    if (!autoModeEnabled) return;

    // Check immediately
    checkNightMode();

    // Check every minute
    const interval = setInterval(checkNightMode, 60000);

    return () => clearInterval(interval);
  }, [autoModeEnabled, startHour, endHour]);

  // Apply night mode class to document
  useEffect(() => {
    if (autoModeEnabled && isNightMode) {
      document.documentElement.classList.add('night-mode');
      document.documentElement.style.setProperty('--night-mode-filter', 'brightness(0.9) saturate(0.95)');
    } else {
      document.documentElement.classList.remove('night-mode');
      document.documentElement.style.removeProperty('--night-mode-filter');
    }
  }, [isNightMode, autoModeEnabled]);

  return {
    isNightMode,
    autoModeEnabled,
    setAutoModeEnabled,
    toggleAutoMode: () => setAutoModeEnabled(prev => !prev),
  };
};

export default useAutoNightMode;
