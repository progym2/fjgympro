import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CompactBackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

/**
 * Compact back button optimized for mobile
 * Small, touch-friendly, and visually consistent
 */
const CompactBackButton: React.FC<CompactBackButtonProps> = ({
  to,
  label,
  className
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.button
      onClick={handleBack}
      className={cn(
        'inline-flex items-center gap-0.5 px-2 py-1 rounded-lg',
        'text-xs font-medium text-muted-foreground',
        'bg-background/50 border border-border/50',
        'hover:bg-primary/10 hover:text-primary hover:border-primary/30',
        'active:scale-95 transition-all duration-200',
        className
      )}
      whileTap={{ scale: 0.95 }}
    >
      <ChevronLeft className="w-4 h-4" />
      <span className="hidden sm:inline">{label || 'Voltar'}</span>
    </motion.button>
  );
};

export default CompactBackButton;
