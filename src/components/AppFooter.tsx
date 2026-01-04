import React from 'react';
import { motion } from 'framer-motion';

const AppFooter: React.FC = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="py-3 sm:py-4 flex-shrink-0"
    >
      <div className="text-center">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Desenvolvido por{' '}
          <span className="text-primary font-semibold">Franc D'nis</span>
        </p>
      </div>
    </motion.footer>
  );
};

export default AppFooter;
