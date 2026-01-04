import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FadeScrollListProps {
  children: React.ReactNode;
  className?: string;
  fadeSize?: number;
  showScrollToTop?: boolean;
  scrollTopThreshold?: number;
}

const FadeScrollList: React.FC<FadeScrollListProps> = ({
  children,
  className,
  fadeSize = 32,
  showScrollToTop = true,
  scrollTopThreshold = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const checkScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowTopFade(scrollTop > 5);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 5);
    setShowScrollButton(showScrollToTop && scrollTop > scrollTopThreshold);
  }, [showScrollToTop, scrollTopThreshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScroll();
    container.addEventListener('scroll', checkScroll, { passive: true });
    
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  const scrollToTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  return (
    <div className="relative">
      {/* Top fade */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-10 pointer-events-none',
          showTopFade ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          height: fadeSize,
          background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)',
          transition: 'opacity 150ms ease-out',
        }}
      />
      
      {/* Content */}
      <div
        ref={containerRef}
        className={cn('overflow-y-auto scroll-smooth', className)}
      >
        {children}
      </div>
      
      {/* Bottom fade */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-10 pointer-events-none',
          showBottomFade ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          height: fadeSize,
          background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
          transition: 'opacity 150ms ease-out',
        }}
      />

      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className={cn(
          'absolute bottom-4 right-4 z-20 p-2 rounded-full',
          'bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25',
          'hover:bg-primary hover:scale-110 active:scale-95',
          'transition-all duration-200',
          showScrollButton 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
        aria-label="Voltar ao topo"
      >
        <ChevronUp size={20} />
      </button>
    </div>
  );
};

export default FadeScrollList;
