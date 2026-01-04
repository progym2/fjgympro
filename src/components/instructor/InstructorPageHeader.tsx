import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 -mx-4 px-4 py-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          <h2 className={`text-xl font-bebas tracking-wider ${iconColor}`}>{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            Voltar <ArrowLeft size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstructorPageHeader;
