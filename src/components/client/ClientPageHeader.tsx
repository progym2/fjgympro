import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/lib/themeStyles';

interface ClientPageHeaderProps {
  title: string;
  icon: React.ReactNode;
  iconColor?: string;
  backTo?: string;
}

const ClientPageHeader: React.FC<ClientPageHeaderProps> = ({ 
  title, 
  icon, 
  iconColor,
  backTo = '/client'
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
      "sticky top-0 z-10 backdrop-blur-sm -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 sm:py-3 mb-3 sm:mb-4",
      themeStyles.cardBg,
      "border-b",
      themeStyles.cardBorder
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className={cn(finalIconColor, 'shrink-0')}>{icon}</span>
          <h2 className={cn('text-lg sm:text-xl font-bebas tracking-wider truncate', themeStyles.titleColor)}>
            {title}
          </h2>
        </div>
        <motion.button
          onClick={() => navigate(-1)}
          className={cn(
            'inline-flex items-center gap-0.5 px-2 py-1 rounded-lg',
            'text-xs font-medium',
            themeStyles.accentColor,
            themeStyles.inputBg,
            'border',
            themeStyles.inputBorder,
            'hover:opacity-80',
            'active:scale-95 transition-all duration-200 shrink-0'
          )}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </motion.button>
      </div>
    </div>
  );
};

export default ClientPageHeader;
