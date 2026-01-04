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
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md rounded-2xl"
        >
          {/* Logo com animação pulsante */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative"
          >
            {/* Círculo de loading externo */}
            <motion.div
              className="absolute -inset-4 border-4 border-transparent border-t-primary rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Círculo de loading interno (direção oposta) */}
            <motion.div
              className="absolute -inset-2 border-2 border-transparent border-b-primary/50 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Logo */}
            <motion.div
              className="w-20 h-20 rounded-2xl bg-card border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20"
              animate={{ 
                boxShadow: [
                  '0 10px 25px -5px hsl(var(--primary) / 0.2)',
                  '0 10px 25px -5px hsl(var(--primary) / 0.4)',
                  '0 10px 25px -5px hsl(var(--primary) / 0.2)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.img
                src={logomarca}
                alt="Loading"
                className="w-14 h-14 object-contain"
                animate={{ 
                  scale: [1, 1.05, 1],
                  filter: [
                    'drop-shadow(0 0 8px hsl(var(--primary)/0.3))',
                    'drop-shadow(0 0 16px hsl(var(--primary)/0.6))',
                    'drop-shadow(0 0 8px hsl(var(--primary)/0.3))'
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
          
          {/* Mensagem de loading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <motion.p 
              className="text-lg font-bebas tracking-wider text-primary"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {message}
            </motion.p>
            
            {/* Barra de progresso animada */}
            <div className="mt-3 w-48 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '50%' }}
              />
            </div>
          </motion.div>
          
          {/* Partículas decorativas */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/40 rounded-full"
                initial={{ 
                  x: '50%', 
                  y: '50%',
                  opacity: 0 
                }}
                animate={{ 
                  x: `${30 + Math.random() * 40}%`,
                  y: `${20 + Math.random() * 60}%`,
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0]
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginLoadingOverlay;
