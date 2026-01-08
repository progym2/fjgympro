import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InstructorPageHeaderProps {
  title: string;
  icon: React.ReactNode;
  iconColor?: string;
  backTo?: string;
  action?: React.ReactNode;
}

const InstructorPageHeader: React.FC<InstructorPageHeaderProps> = ({ 
  title, 
  icon, 
  iconColor = 'text-primary',
  backTo = '/instructor',
  action
}) => {
  const navigate = useNavigate();

  // Handle ESC key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 sm:py-3 mb-3 sm:mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className={cn(iconColor, 'shrink-0')}>{icon}</span>
          <h2 className={cn('text-lg sm:text-xl font-bebas tracking-wider truncate', iconColor)}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {action}
          <motion.button
            onClick={() => navigate(-1)}
            className={cn(
              'inline-flex items-center gap-0.5 px-2 py-1 rounded-lg',
              'text-xs font-medium text-muted-foreground',
              'bg-background/50 border border-border/50',
              'hover:bg-primary/10 hover:text-primary hover:border-primary/30',
              'active:scale-95 transition-all duration-200'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default InstructorPageHeader;
