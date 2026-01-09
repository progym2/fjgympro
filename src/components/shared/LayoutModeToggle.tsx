import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, MenuLayoutMode } from '@/contexts/ThemeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

const LayoutModeToggle: React.FC = () => {
  const { menuLayout, setMenuLayout } = useTheme();

  const toggleLayout = () => {
    const newLayout: MenuLayoutMode = menuLayout === 'grid' ? 'list' : 'grid';
    setMenuLayout(newLayout);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLayout}
            className="h-8 w-8 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors"
          >
            <motion.div
              key={menuLayout}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {menuLayout === 'grid' ? (
                <LayoutGrid size={16} className="text-primary" />
              ) : (
                <List size={16} className="text-primary" />
              )}
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {menuLayout === 'grid' ? 'Mudar para Lista' : 'Mudar para Grade'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LayoutModeToggle;
