import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logomarca from '@/assets/logomarca.png';

interface LoginLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoginLoadingOverlay: React.FC<LoginLoadingOverlayProps> = ({ 
  isVisible, 
  message = 'Autenticando...' 
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm rounded-2xl"
        >
          {/* Spinner simples e rápido */}
          <div className="relative">
            <motion.div
              className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              style={{ borderWidth: '3px' }}
            />
          </div>
          
          {/* Mensagem */}
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginLoadingOverlay;
