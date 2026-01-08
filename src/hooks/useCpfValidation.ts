import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCPFDigits, validateCPF } from '@/lib/inputValidation';

export type UserLevel = 'client' | 'instructor' | 'admin' | 'master' | 'any';

interface CpfValidationResult {
  isChecking: boolean;
  isDuplicate: boolean;
  duplicateName: string | null;
  duplicateLevel: string | null;
  isValid: boolean;
  error: string;
}

interface CpfValidationOptions {
  debounceMs?: number;
  checkLevel?: UserLevel;
  excludeProfileId?: string;
}

export function useCpfValidation(
  cpf: string, 
  options: CpfValidationOptions = {}
): CpfValidationResult {
  const { debounceMs = 500, checkLevel = 'any', excludeProfileId } = options;
  
  const [isChecking, setIsChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [duplicateLevel, setDuplicateLevel] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getUserLevel = (profile: { cref?: string | null; created_by_admin?: string | null }): string => {
    if (profile.cref) return 'instructor';
    if (profile.created_by_admin) return 'client';
    return 'admin';
  };

  const checkCpf = useCallback(async (cpfValue: string) => {
    const digits = getCPFDigits(cpfValue);
    
    // Reset states if CPF is incomplete
    if (!digits || digits.length < 11) {
      setIsDuplicate(false);
      setDuplicateName(null);
      setDuplicateLevel(null);
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
      setDuplicateLevel(null);
      return;
    }

    setIsValid(true);
    setError('');
    setIsChecking(true);

    try {
      // Query profiles with this CPF
      let query = supabase
        .from('profiles')
        .select('id, full_name, cref, created_by_admin')
        .eq('cpf', digits);
      
      // Exclude current profile if editing
      if (excludeProfileId) {
        query = query.neq('id', excludeProfileId);
      }

      const { data: existingProfiles } = await query;

      if (existingProfiles && existingProfiles.length > 0) {
        // Filter by level if specified
        let matchingProfile = existingProfiles[0];
        
        if (checkLevel !== 'any') {
          const filtered = existingProfiles.filter(p => {
            const level = getUserLevel(p);
            return level === checkLevel;
          });
          
          if (filtered.length > 0) {
            matchingProfile = filtered[0];
            const level = getUserLevel(matchingProfile);
            const levelLabels: Record<string, string> = {
              'client': 'cliente',
              'instructor': 'instrutor',
              'admin': 'administrador'
            };
            
            setIsDuplicate(true);
            setDuplicateName(matchingProfile.full_name || 'outro usuário');
            setDuplicateLevel(levelLabels[level] || level);
            setError(`CPF já cadastrado como ${levelLabels[level]}: ${matchingProfile.full_name || 'outro usuário'}`);
          } else {
            // CPF exists but for a different level - still warn but differently
            const existingLevel = getUserLevel(matchingProfile);
            const levelLabels: Record<string, string> = {
              'client': 'cliente',
              'instructor': 'instrutor',
              'admin': 'administrador'
            };
            
            setIsDuplicate(true);
            setDuplicateName(matchingProfile.full_name || 'outro usuário');
            setDuplicateLevel(levelLabels[existingLevel] || existingLevel);
            setError(`CPF já cadastrado como ${levelLabels[existingLevel]}: ${matchingProfile.full_name || 'outro usuário'}`);
          }
        } else {
          // Any level - just report the duplicate
          const level = getUserLevel(matchingProfile);
          const levelLabels: Record<string, string> = {
            'client': 'cliente',
            'instructor': 'instrutor',
            'admin': 'administrador'
          };
          
          setIsDuplicate(true);
          setDuplicateName(matchingProfile.full_name || 'outro usuário');
          setDuplicateLevel(levelLabels[level] || level);
          setError(`CPF já cadastrado como ${levelLabels[level]}: ${matchingProfile.full_name || 'outro usuário'}`);
        }
      } else {
        setIsDuplicate(false);
        setDuplicateName(null);
        setDuplicateLevel(null);
        setError('');
      }
    } catch (err) {
      console.error('Error checking CPF:', err);
      // Don't show error to user for network issues - will be validated on submit
    } finally {
      setIsChecking(false);
    }
  }, [checkLevel, excludeProfileId]);

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
      setDuplicateLevel(null);
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
    duplicateLevel,
    isValid,
    error,
  };
}
