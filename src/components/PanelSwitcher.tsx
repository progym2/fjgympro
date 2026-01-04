import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Dumbbell, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';

const panels = [
  { id: 'client', path: '/client', label: 'Cliente', icon: User, color: 'text-primary' },
  { id: 'instructor', path: '/instructor', label: 'Instrutor', icon: Dumbbell, color: 'text-green-500' },
  { id: 'admin', path: '/admin', label: 'Gerente', icon: Shield, color: 'text-blue-500' },
];

const PanelSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const { playClickSound } = useAudio();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for masters
  if (role !== 'master') return null;

  const currentPath = location.pathname;
  const currentPanel = panels.find(p => currentPath.startsWith(p.path)) || panels[2];
  const otherPanels = panels.filter(p => p.id !== currentPanel.id);

  const handleSwitch = (path: string) => {
    playClickSound();
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => { playClickSound(); setIsOpen(!isOpen); }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-lg hover:border-primary/50 transition-colors"
      >
        <currentPanel.icon size={16} className={currentPanel.color} />
        <span className="text-xs font-medium hidden sm:inline">{currentPanel.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown size={14} className="text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute top-full left-0 mt-2 z-50 min-w-[140px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl overflow-hidden"
            >
              <div className="p-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Trocar para
                </div>
                {otherPanels.map((panel) => (
                  <motion.button
                    key={panel.id}
                    onClick={() => handleSwitch(panel.path)}
                    whileHover={{ x: 2 }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <panel.icon size={16} className={panel.color} />
                    <span className="text-sm">{panel.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PanelSwitcher;