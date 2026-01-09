import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/lib/themeStyles';

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
  iconColor,
  backTo = '/instructor',
  action
}) => {
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();

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

  // Use theme color if no custom color provided
  const finalIconColor = iconColor || themeStyles.titleColor;

  return (
    <div className={cn(
      "sticky top-0 z-10 backdrop-blur-sm -mx-1 sm:-mx-3 px-1 sm:px-3 py-1.5 sm:py-2 mb-2",
      themeStyles.cardBg,
      "border-b",
      themeStyles.cardBorder
    )}>
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span className={cn(finalIconColor, 'shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5')}>{icon}</span>
          <h2 className={cn('text-sm sm:text-base font-bebas tracking-wider truncate', themeStyles.titleColor)}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {action}
          <motion.button
            onClick={() => navigate(-1)}
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg',
              'text-[10px] sm:text-xs font-medium',
              themeStyles.accentColor,
              themeStyles.inputBg,
              'border',
              themeStyles.inputBorder,
              'hover:opacity-80',
              'active:scale-95 transition-all duration-200'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default InstructorPageHeader;
