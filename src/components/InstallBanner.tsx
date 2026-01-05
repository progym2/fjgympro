import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '@/contexts/AudioContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_BANNER_SHOWN_KEY = 'francgympro_install_banner_shown';
const APP_INSTALLED_KEY = 'francgympro_app_installed';

const InstallBanner: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [showBanner, setShowBanner] = useState(false);
  const [showDiscreteButton, setShowDiscreteButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if mobile
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone || localStorage.getItem(APP_INSTALLED_KEY) === 'true') {
      setIsInstalled(true);
      return;
    }

    // Check if banner was already shown (show only once ever)
    const bannerShown = localStorage.getItem(INSTALL_BANNER_SHOWN_KEY) === 'true';

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // If banner was shown before, show discrete button instead
      if (bannerShown) {
        setShowDiscreteButton(true);
      }
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setShowDiscreteButton(false);
      localStorage.setItem(APP_INSTALLED_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show banner only once, after 3 seconds, for mobile users
    let timer: NodeJS.Timeout;
    if (mobile && !bannerShown && !isStandalone) {
      timer = setTimeout(() => {
        setShowBanner(true);
        localStorage.setItem(INSTALL_BANNER_SHOWN_KEY, 'true');
      }, 3000);
    } else if (mobile && bannerShown && !isStandalone) {
      // If banner was shown before, show discrete button after prompt is ready
      setShowDiscreteButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    playClickSound();
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        setShowDiscreteButton(false);
        setIsInstalled(true);
        localStorage.setItem(APP_INSTALLED_KEY, 'true');
      }
      
      setDeferredPrompt(null);
    } else {
      // Navigate to install page for iOS or manual instructions
      navigate('/install');
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // After dismissing, show discrete button
    setShowDiscreteButton(true);
  };

  // Don't render anything if installed or not mobile
  if (isInstalled || !isMobile) {
    return null;
  }

  // Show discrete button if banner was already shown/dismissed
  if (showDiscreteButton && !showBanner && deferredPrompt) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-24 right-4 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        onClick={handleInstall}
        aria-label="Instalar aplicativo"
      >
        <Download size={20} />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-0 right-0 z-[60] p-4 pb-safe"
        >
          <div className="bg-gradient-to-r from-primary/95 to-primary/80 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-primary/30 mx-auto max-w-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Download size={20} className="text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-primary-foreground text-sm truncate">
                    Instalar FrancGymPro
                  </h3>
                  <p className="text-primary-foreground/80 text-xs">
                    Acesso rápido na tela inicial
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  variant="secondary"
                  className="bg-white text-primary hover:bg-white/90 font-semibold text-xs px-3"
                >
                  Instalar
                </Button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={18} className="text-primary-foreground/80" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallBanner;
