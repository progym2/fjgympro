import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsernameValidationResult {
  isChecking: boolean;
  isDuplicate: boolean;
  isValid: boolean;
  error: string;
}

export function useUsernameValidation(username: string, debounceMs: number = 500): UsernameValidationResult {
  const [isChecking, setIsChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkUsername = useCallback(async (usernameValue: string) => {
    const trimmed = usernameValue.trim().toLowerCase();
    
    // Reset states if username is too short
    if (!trimmed || trimmed.length < 3) {
      setIsDuplicate(false);
      setIsValid(true);
      setError('');
      return;
    }

    // Validate username format (only letters, numbers, dots, underscores)
    const usernameRegex = /^[a-z0-9._]+$/;
    if (!usernameRegex.test(trimmed)) {
      setIsValid(false);
      setError('Apenas letras, números, pontos e underscores');
      setIsDuplicate(false);
      return;
    }

    setIsValid(true);
    setError('');
    setIsChecking(true);

    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('username', trimmed)
        .maybeSingle();

      if (existingUser) {
        setIsDuplicate(true);
        setError('Este nome de usuário já está em uso');
      } else {
        setIsDuplicate(false);
        setError('');
      }
    } catch (err) {
      console.error('Error checking username:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const trimmed = username.trim();
    
    // Only start checking when we have a valid username length
    if (trimmed.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        checkUsername(username);
      }, debounceMs);
    } else {
      // Reset states for short username
      setIsDuplicate(false);
      setIsValid(true);
      setError('');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [username, debounceMs, checkUsername]);

  return {
    isChecking,
    isDuplicate,
    isValid,
    error,
  };
}
