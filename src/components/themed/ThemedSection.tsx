import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/lib/themeStyles';

interface ThemedSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  description?: string;
}

export const ThemedSection: React.FC<ThemedSectionProps> = ({
  children,
  className,
  title,
  icon,
  description,
}) => {
  const themeStyles = useThemeStyles();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl p-4 backdrop-blur-md',
        themeStyles.cardBg,
        'border',
        themeStyles.cardBorder,
        className
      )}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className={themeStyles.iconColor}>{icon}</span>}
          {title && (
            <h3 className={cn('font-bebas text-lg tracking-wider', themeStyles.titleColor)}>
              {title}
            </h3>
          )}
        </div>
      )}
      {description && (
        <p className={cn('text-sm mb-4', themeStyles.accentColor)}>
          {description}
        </p>
      )}
      {children}
    </motion.section>
  );
};

export default ThemedSection;