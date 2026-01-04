import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCPFDigits, validateCPF } from '@/lib/inputValidation';

interface CpfValidationResult {
  isChecking: boolean;
  isDuplicate: boolean;
  duplicateName: string | null;
  isValid: boolean;
  error: string;
}

export function useCpfValidation(cpf: string, debounceMs: number = 500): CpfValidationResult {
  const [isChecking, setIsChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkCpf = useCallback(async (cpfValue: string) => {
    const digits = getCPFDigits(cpfValue);
    
    // Reset states if CPF is incomplete
    if (!digits || digits.length < 11) {
      setIsDuplicate(false);
      setDuplicateName(null);
      setIsValid(true);
      setError('');
      return;
    }

    // Validate CPF format
    if (!validateCPF(cpfValue)) {
      setIsValid(false);
      setError('CPF inválido');
      setIsDuplicate(false);
      setDuplicateName(null);
      return;
    }

    setIsValid(true);
    setError('');
    setIsChecking(true);

    try {
      const { data: existingCPF } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('cpf', digits)
        .maybeSingle();

      if (existingCPF) {
        setIsDuplicate(true);
        setDuplicateName(existingCPF.full_name || 'outro usuário');
        setError(`CPF já cadastrado para: ${existingCPF.full_name || 'outro usuário'}`);
      } else {
        setIsDuplicate(false);
        setDuplicateName(null);
        setError('');
      }
    } catch (err) {
      console.error('Error checking CPF:', err);
      // Don't show error to user for network issues - will be validated on submit
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const digits = getCPFDigits(cpf);
    
    // Only start checking when we have a complete CPF
    if (digits && digits.length === 11) {
      timeoutRef.current = setTimeout(() => {
        checkCpf(cpf);
      }, debounceMs);
    } else {
      // Reset states for incomplete CPF
      setIsDuplicate(false);
      setDuplicateName(null);
      if (digits && digits.length > 0 && digits.length < 11) {
        setIsValid(true);
        setError('');
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [cpf, debounceMs, checkCpf]);

  return {
    isChecking,
    isDuplicate,
    duplicateName,
    isValid,
    error,
  };
}
