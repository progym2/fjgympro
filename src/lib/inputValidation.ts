/**
 * Input validation utilities for form fields
 */

/**
 * Filters input to allow only numeric characters (0-9)
 * Allows empty string for clearing the field
 */
export const filterNumericOnly = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

/**
 * Filters input to allow numbers and decimal point
 * Allows empty string for clearing the field
 */
export const filterDecimalOnly = (value: string): string => {
  // Remove all non-numeric characters except decimal point
  let filtered = value.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = filtered.split('.');
  if (parts.length > 2) {
    filtered = parts[0] + '.' + parts.slice(1).join('');
  }
  
  return filtered;
};

/**
 * Filters input to allow only phone number characters (0-9, spaces, parentheses, hyphens)
 */
export const filterPhoneOnly = (value: string): string => {
  return value.replace(/[^0-9()\-\s]/g, '');
};

/**
 * Handler for numeric-only input fields
 * Use with onChange: onChange={(e) => handleNumericInput(e, setValue)}
 */
export const handleNumericInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void
) => {
  const filtered = filterNumericOnly(e.target.value);
  setter(filtered);
};

/**
 * Handler for decimal input fields (allows one decimal point)
 * Use with onChange: onChange={(e) => handleDecimalInput(e, setValue)}
 */
export const handleDecimalInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void
) => {
  const filtered = filterDecimalOnly(e.target.value);
  setter(filtered);
};

/**
 * Handler for phone input fields
 * Use with onChange: onChange={(e) => handlePhoneInput(e, setValue)}
 */
export const handlePhoneInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void
) => {
  const filtered = filterPhoneOnly(e.target.value);
  setter(filtered);
};

/**
 * Prevents non-numeric key presses on input fields
 * Use with onKeyDown: onKeyDown={preventNonNumericInput}
 */
export const preventNonNumericInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Allow: backspace, delete, tab, escape, enter, decimal point
  if (
    e.key === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'Tab' ||
    e.key === 'Escape' ||
    e.key === 'Enter' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.key === 'Home' ||
    e.key === 'End' ||
    (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))
  ) {
    return;
  }
  
  // Block if not a number
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Prevents non-decimal key presses on input fields (allows one decimal point)
 * Use with onKeyDown: onKeyDown={(e) => preventNonDecimalInput(e, currentValue)}
 */
export const preventNonDecimalInput = (
  e: React.KeyboardEvent<HTMLInputElement>,
  currentValue: string
) => {
  // Allow: backspace, delete, tab, escape, enter
  if (
    e.key === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'Tab' ||
    e.key === 'Escape' ||
    e.key === 'Enter' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.key === 'Home' ||
    e.key === 'End' ||
    (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))
  ) {
    return;
  }
  
  // Allow decimal point if not already present
  if (e.key === '.' && !currentValue.includes('.')) {
    return;
  }
  
  // Block if not a number
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Format CPF as XXX.XXX.XXX-XX
 */
export const formatCPF = (value: string): string => {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
};

/**
 * Get only numeric digits from CPF
 */
export const getCPFDigits = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Validate CPF (Brazilian individual taxpayer registry)
 * Returns true if CPF is valid
 */
export const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  
  // Must have 11 digits
  if (digits.length !== 11) return false;
  
  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(digits)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.charAt(10))) return false;
  
  return true;
};
