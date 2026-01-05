import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '@/contexts/AudioContext';

interface UseEscapeBackOptions {
  /** Path to navigate to when ESC is pressed. If not provided, uses navigate(-1) */
  to?: string;
  /** Array of boolean states that, when true, will prevent ESC navigation (e.g., open dialogs) */
  disableWhen?: boolean[];
  /** Whether the hook is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Hook that handles ESC key to navigate back.
 * Automatically plays click sound and navigates to the specified path or back.
 * 
 * @example
 * // Navigate to /admin when ESC is pressed
 * useEscapeBack({ to: '/admin' });
 * 
 * @example
 * // Disable when a dialog is open
 * useEscapeBack({ to: '/admin', disableWhen: [isDialogOpen, isConfirmOpen] });
 */
export function useEscapeBack(options: UseEscapeBackOptions = {}) {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { to, disableWhen = [], enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      
      // Check if any blocking condition is true
      const isBlocked = disableWhen.some(condition => condition === true);
      if (isBlocked) return;

      e.preventDefault();
      playClickSound();
      
      if (to) {
        navigate(to);
      } else {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, playClickSound, to, enabled, ...disableWhen]);
}

export default useEscapeBack;
