import React, { useState, useCallback, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MaskedInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  mask: 'cpf' | 'phone' | 'date' | 'cep' | 'currency';
  onValueChange?: (rawValue: string, formattedValue: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Mask functions
const applyMask = (value: string, mask: MaskedInputProps['mask']): string => {
  const digits = value.replace(/\D/g, '');
  
  switch (mask) {
    case 'cpf':
      return formatCPF(digits);
    case 'phone':
      return formatPhone(digits);
    case 'date':
      return formatDate(digits);
    case 'cep':
      return formatCEP(digits);
    case 'currency':
      return formatCurrency(digits);
    default:
      return value;
  }
};

const formatCPF = (value: string): string => {
  const digits = value.slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string): string => {
  const digits = value.slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatDate = (value: string): string => {
  const digits = value.slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatCEP = (value: string): string => {
  const digits = value.slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatCurrency = (value: string): string => {
  const digits = value.slice(0, 12);
  if (!digits) return '';
  const number = parseInt(digits, 10) / 100;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getMaxLength = (mask: MaskedInputProps['mask']): number => {
  switch (mask) {
    case 'cpf': return 14; // 000.000.000-00
    case 'phone': return 15; // (00) 00000-0000
    case 'date': return 10; // 00/00/0000
    case 'cep': return 9; // 00000-000
    case 'currency': return 17; // R$ 000.000.000,00
    default: return 50;
  }
};

const getPlaceholder = (mask: MaskedInputProps['mask']): string => {
  switch (mask) {
    case 'cpf': return '000.000.000-00';
    case 'phone': return '(00) 00000-0000';
    case 'date': return 'DD/MM/AAAA';
    case 'cep': return '00000-000';
    case 'currency': return 'R$ 0,00';
    default: return '';
  }
};

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onValueChange, onChange, className, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const formatted = applyMask(rawInput, mask);
      const rawValue = rawInput.replace(/\D/g, '');
      
      setDisplayValue(formatted);
      
      if (onValueChange) {
        onValueChange(rawValue, formatted);
      }
      
      if (onChange) {
        // Create a synthetic event with the formatted value
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: formatted,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }, [mask, onValueChange, onChange]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={mask === 'currency' ? 'decimal' : 'numeric'}
        value={displayValue}
        onChange={handleChange}
        maxLength={getMaxLength(mask)}
        placeholder={placeholder || getPlaceholder(mask)}
        className={cn('font-mono', className)}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

// Validation helpers
export const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let checkDigit = (sum * 10) % 11;
  if (checkDigit === 10) checkDigit = 0;
  if (checkDigit !== parseInt(digits[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  checkDigit = (sum * 10) % 11;
  if (checkDigit === 10) checkDigit = 0;
  if (checkDigit !== parseInt(digits[10])) return false;
  
  return true;
};

export const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

export const validateDate = (date: string): boolean => {
  const digits = date.replace(/\D/g, '');
  if (digits.length !== 8) return false;
  
  const day = parseInt(digits.slice(0, 2));
  const month = parseInt(digits.slice(2, 4));
  const year = parseInt(digits.slice(4, 8));
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  const dateObj = new Date(year, month - 1, day);
  return dateObj.getDate() === day && dateObj.getMonth() === month - 1;
};

export { MaskedInput };
export default MaskedInput;