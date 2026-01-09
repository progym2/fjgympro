import React, { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Ultra-fast transition - 30ms for perceived instant loading
const PageTransition = memo(forwardRef<HTMLDivElement, PageTransitionProps>(({ children }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.03, ease: 'linear' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}));

PageTransition.displayName = 'PageTransition';

export default PageTransition;