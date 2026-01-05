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

const INSTALL_BANNER_KEY = 'francgympro_install_banner_dismissed';

const InstallBanner: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    checkMobile();

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if banner was already dismissed
    const dismissed = localStorage.getItem(INSTALL_BANNER_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysDiff < 7) {
        return;
      }
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner after 2 seconds for mobile first-time visitors
    const timer = setTimeout(() => {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setShowBanner(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    playClickSound();
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } else {
      // Navigate to install page for iOS or manual instructions
      navigate('/install');
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_BANNER_KEY, new Date().toISOString());
    setShowBanner(false);
  };

  if (isInstalled || !isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-0 right-0 z-[60] p-4 safe-area-pb"
        >
          <div className="bg-gradient-to-r from-primary/95 to-primary/80 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-primary/30 mx-auto max-w-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(255,255,255,0.4)',
                      '0 0 0 8px rgba(255,255,255,0)',
                      '0 0 0 0 rgba(255,255,255,0)'
                    ]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: 'easeInOut' 
                  }}
                >
                  <Download size={24} className="text-primary-foreground" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-primary-foreground text-sm">
                    Instalar FrancGymPro
                  </h3>
                  <p className="text-primary-foreground/80 text-xs">
                    Acesso rápido na tela inicial
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
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
