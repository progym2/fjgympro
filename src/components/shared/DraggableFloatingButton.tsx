import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripVertical } from 'lucide-react';

interface DraggableFloatingButtonProps {
  children: React.ReactNode;
  storageKey: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
  className?: string;
  showCloseButton?: boolean;
}

const DraggableFloatingButton: React.FC<DraggableFloatingButtonProps> = ({
  children,
  storageKey,
  defaultPosition = { x: 16, y: 80 },
  onClose,
  className = '',
  showCloseButton = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ right: defaultPosition.x, bottom: defaultPosition.y });
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; right: number; bottom: number } | null>(null);

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`floatingPos_${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPosition({
          right: Math.max(8, Math.min(window.innerWidth - 80, parsed.right ?? defaultPosition.x)),
          bottom: Math.max(8, Math.min(window.innerHeight - 80, parsed.bottom ?? defaultPosition.y)),
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }, [storageKey, defaultPosition]);

  // Save position
  const savePosition = useCallback((pos: { right: number; bottom: number }) => {
    try {
      localStorage.setItem(`floatingPos_${storageKey}`, JSON.stringify(pos));
    } catch (e) {
      // Ignore errors
    }
  }, [storageKey]);

  // Handle drag start
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setShowControls(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      right: position.right,
      bottom: position.bottom,
    };
  }, [position]);

  // Handle drag move
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current || !isDragging) return;

    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;

    const newRight = Math.max(8, Math.min(window.innerWidth - 80, dragStartRef.current.right + deltaX));
    const newBottom = Math.max(8, Math.min(window.innerHeight - 80, dragStartRef.current.bottom + deltaY));

    setPosition({ right: newRight, bottom: newBottom });
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      savePosition(position);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, position, savePosition]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    }
  }, [handleDragStart]);

  // Global move/end listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    };

    const handleEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Hide controls after timeout
  useEffect(() => {
    if (showControls && !isDragging) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isDragging]);

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 touch-none select-none ${className}`}
      style={{
        right: position.right,
        bottom: position.bottom,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isDragging && setShowControls(false)}
    >
      {/* Container with controls */}
      <div className="relative">
        {/* Floating controls */}
        <div
          className={`absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-full px-2 py-1 shadow-lg transition-all duration-200 ${
            showControls || isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="p-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"
          >
            <GripVertical size={14} />
          </div>
          
          {/* Close button */}
          {showCloseButton && onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Children content - also draggable */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`transition-opacity duration-150 ${isDragging ? 'opacity-75' : 'opacity-100'}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DraggableFloatingButton;
