import { getJakartaCurrentYearMonth } from './dateFormatter';

/**
 * NIP Validator & Formatter for Indonesian Civil Servants (ASN)
 * Format: 18 digits (YYYYMMDD YYYYMM G NNN)
 * YYYYMMDD: Birth Date
 * YYYYMM: CPNS Appointment Date
 * G: Gender (1 = Pria, 2 = Wanita)
 * NNN: Sequence Number
 */

export const cleanNIP = (nip: string): string => {
  return nip.replace(/\D/g, '').slice(0, 18);
};

export const isValidNIP = (nip: string): boolean => {
  const cleaned = cleanNIP(nip);
  if (cleaned.length !== 18) {
    return false;
  }

  // Validate birth year reasonableness in Asia/Jakarta
  const birthYear = parseInt(cleaned.substring(0, 4), 10);
  const { year: currentYear } = getJakartaCurrentYearMonth();
  if (birthYear < 1945 || birthYear > currentYear - 17) {
    return false;
  }

  // Validate birth month
  const birthMonth = parseInt(cleaned.substring(4, 6), 10);
  if (birthMonth < 1 || birthMonth > 12) {
    return false;
  }

  // Validate gender digit (1 = Male, 2 = Female)
  const gender = parseInt(cleaned.substring(14, 15), 10);
  if (gender !== 1 && gender !== 2) {
    return false;
  }

  return true;
};

export interface NIPValidationResult {
  isValid: boolean;
  birthYear?: number;
  gender?: 'Pria' | 'Wanita';
}

export const validateNIP = (nip: string): NIPValidationResult => {
  const valid = isValidNIP(nip);
  if (!valid) return { isValid: false };

  const cleaned = cleanNIP(nip);
  const birthYear = parseInt(cleaned.substring(0, 4), 10);
  const genderCode = parseInt(cleaned.substring(14, 15), 10);

  return {
    isValid: true,
    birthYear,
    gender: genderCode === 1 ? 'Pria' : 'Wanita',
  };
};

export const formatNIP = (nip: string): string => {
  const cleaned = cleanNIP(nip);
  if (cleaned.length <= 8) return cleaned;
  if (cleaned.length <= 14) return `${cleaned.slice(0, 8)} ${cleaned.slice(8)}`;
  if (cleaned.length <= 15) return `${cleaned.slice(0, 8)} ${cleaned.slice(8, 14)} ${cleaned.slice(14)}`;
  return `${cleaned.slice(0, 8)} ${cleaned.slice(8, 14)} ${cleaned.slice(14, 15)} ${cleaned.slice(15, 18)}`;
};
