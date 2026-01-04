import React from 'react';
import { Droplets, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface WidgetRestoreButtonProps {
  hydrationHidden: boolean;
  notificationsHidden: boolean;
  onRestoreHydration: () => void;
  onRestoreNotifications: () => void;
}

const WidgetRestoreButton: React.FC<WidgetRestoreButtonProps> = ({
  hydrationHidden,
  notificationsHidden,
  onRestoreHydration,
  onRestoreNotifications,
}) => {
  const hasHiddenWidgets = hydrationHidden || notificationsHidden;

  if (!hasHiddenWidgets) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 left-4 z-50 rounded-full w-10 h-10 p-0 bg-card/90 backdrop-blur-md border-primary/50 shadow-lg hover:scale-105 transition-transform"
        >
          <span className="relative">
            <Bell size={18} className="text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-48 p-2 bg-card/95 backdrop-blur-md">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
            Widgets Ocultos
          </p>
          {hydrationHidden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestoreHydration}
              className="w-full justify-start gap-2 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10"
            >
              <Droplets size={16} />
              Hidratação
            </Button>
          )}
          {notificationsHidden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestoreNotifications}
              className="w-full justify-start gap-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
            >
              <Bell size={16} />
              Notificações
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WidgetRestoreButton;
