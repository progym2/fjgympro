import { useEffect, useCallback, useState } from 'react';

interface UseUnsavedChangesOptions {
  hasChanges: boolean;
  message?: string;
}

export const useUnsavedChanges = ({ hasChanges, message = 'Você tem alterações não salvas. Deseja sair sem salvar?' }: UseUnsavedChangesOptions) => {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Handle browser/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, message]);

  // Function to wrap navigation/exit actions
  const confirmExit = useCallback((action: () => void) => {
    if (hasChanges) {
      setPendingAction(() => action);
      setShowExitDialog(true);
    } else {
      action();
    }
  }, [hasChanges]);

  // Confirm and execute pending action
  const handleConfirmExit = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowExitDialog(false);
  }, [pendingAction]);

  // Cancel exit
  const handleCancelExit = useCallback(() => {
    setPendingAction(null);
    setShowExitDialog(false);
  }, []);

  return {
    showExitDialog,
    setShowExitDialog,
    confirmExit,
    handleConfirmExit,
    handleCancelExit,
    hasChanges
  };
};

export default useUnsavedChanges;
