import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Instant transition - 50ms for perceived instant loading
const PageTransition: React.FC<PageTransitionProps> = memo(({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.05, ease: 'linear' }}
      className="w-full h-full will-change-opacity"
    >
      {children}
    </motion.div>
  );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;