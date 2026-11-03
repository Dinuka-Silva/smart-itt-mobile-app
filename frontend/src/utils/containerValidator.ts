/**
 * SMART ITT — ISO 6346 Container Number Validator
 * Implements standard maritime container number validation and check digit computation.
 *
 * Structure:
 * - 3 letters: Owner code (A-Z)
 * - 1 letter: Equipment category identifier (U for all freight containers, J for detachable equipment, Z for trailers)
 * - 6 numeric digits: Serial number
 * - 1 numeric digit: Check digit (modulus 11)
 *
 * Check digit letter values:
 * A=10, B=12, C=13, D=14, E=15, F=16, G=17, H=18, I=19, J=20, K=21, L=23, M=24,
 * N=25, O=26, P=27, Q=28, R=29, S=30, T=31, U=32, V=34, W=35, X=36, Y=37, Z=38
 * (Numbers 11, 22, 33 are omitted multiples of 11).
 *
 * Tests:
 * - CSQU3054383: Valid (Check digit 3)
 * - CSQU3054384: Invalid (Check digit mismatch: calculated 3, actual 4)
 */

import { storage } from '../services/storage';

export const RECENT_CONTAINERS_STORAGE_KEY = 'smartitt_recent_containers';

export const ISO_CHAR_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export interface ContainerValidationResult {
  normalized: string;
  isFormatValid: boolean;
  isCheckDigitValid: boolean;
  isDuplicate: boolean;
  isVerified: boolean;
  message: string;
  severity: 'ok' | 'warning' | 'error';
  expectedCheckDigit?: number;
  actualCheckDigit?: number;
  suggestedNumber?: string;
  typoWarning?: string;
}

/**
 * Normalizes container input: uppercase, strip spaces/dashes/symbols, max 11 chars.
 */
export function normalize(raw: string): string {
  if (!raw) return '';
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
  return clean.slice(0, 11);
}

/**
 * Typo guard: checks if letters 'O' or 'I' are used in the 6-digit numeric portion (chars 4..9).
 */
export function hasTypoInDigits(raw: string): boolean {
  if (!raw) return false;
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length > 4) {
    const end = Math.min(clean.length, 10);
    const digitsPortion = clean.slice(4, end);
    return digitsPortion.includes('O') || digitsPortion.includes('I');
  }
  return false;
}

/**
 * Checks if input has illegal symbols.
 */
export function hasSymbols(raw: string): boolean {
  return /[^A-Za-z0-9\s-]/.test((raw || '').trim());
}

/**
 * Checks if container format strictly matches ISO 6346:
 * 3 owner letters + category letter (U, J, or Z) + 6 digits + 1 check digit = 11 chars.
 */
export function isValidFormat(normalized: string): boolean {
  const clean = normalize(normalized);
  if (clean.length !== 11) return false;
  return /^[A-Z]{3}[UJZ]\d{7}$/.test(clean);
}

/**
 * Computes ISO 6346 modulus-11 check digit for first 10 characters.
 * Returns digit between 0 and 9, or -1 if invalid.
 */
export function calculateCheckDigit(normalized: string): number {
  const clean = normalize(normalized);
  if (clean.length < 10) return -1;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = clean[i];
    let val: number;
    if (/[A-Z]/.test(ch)) {
      val = ISO_CHAR_VALUES[ch] ?? 0;
    } else if (/\d/.test(ch)) {
      val = parseInt(ch, 10);
    } else {
      return -1;
    }
    const weight = Math.pow(2, i);
    sum += val * weight;
  }

  const remainder = sum % 11;
  return remainder % 10; // If remainder is 10, check digit is 0
}

/**
 * Validates check digit: calculates expected digit and compares with 11th character.
 */
export function isValidCheckDigit(normalized: string): boolean {
  if (!isValidFormat(normalized)) return false;
  const clean = normalize(normalized);
  const expected = calculateCheckDigit(clean);
  const actual = parseInt(clean.charAt(10), 10);
  return expected === actual;
}

/**
 * Suggests the valid container number by replacing the check digit with the calculated value.
 */
export function suggestValidContainerNumber(normalized: string): string | null {
  const clean = normalize(normalized);
  if (clean.length >= 10) {
    const prefix = clean.slice(0, 4);
    const digits = clean.slice(4, 10);
    if (/^[A-Z]{3}[UJZ]$/.test(prefix) && /^\d{6}$/.test(digits)) {
      const expected = calculateCheckDigit(clean.slice(0, 10));
      if (expected >= 0) {
        return `${prefix}${digits}${expected}`;
      }
    }
  }
  return null;
}

/**
 * Main validation function. Returns full diagnosis and severity.
 */
export function validateContainerNumber(
  raw: string,
  existingNumbers?: string[]
): ContainerValidationResult {
  const trimmed = (raw || '').trim();
  const normalized = normalize(trimmed);

  if (!trimmed) {
    return {
      normalized: '',
      isFormatValid: false,
      isCheckDigitValid: false,
      isDuplicate: false,
      isVerified: false,
      message: 'Container number is required.',
      severity: 'error',
    };
  }

  // 1. Symbol check
  if (hasSymbols(trimmed)) {
    return {
      normalized,
      isFormatValid: false,
      isCheckDigitValid: false,
      isDuplicate: false,
      isVerified: false,
      message: 'Symbols are not allowed. Please enter numbers without symbols (e.g. CSQU3054383).',
      severity: 'error',
    };
  }

  // 2. Typo guard check (O or I in digit sequence)
  if (hasTypoInDigits(trimmed)) {
    const typoMsg = "Letter 'O' or 'I' detected in numeric sequence. Use 0 / 1 instead.";
    return {
      normalized,
      isFormatValid: false,
      isCheckDigitValid: false,
      isDuplicate: false,
      isVerified: false,
      typoWarning: typoMsg,
      message: typoMsg,
      severity: 'error',
    };
  }

  // 3. Format check
  const formatOk = isValidFormat(normalized);
  if (!formatOk) {
    let hint = 'Must be 3 owner letters + U/J/Z + 7 digits (e.g. CSQU3054383).';
    if (normalized.length < 11) {
      hint = `Incomplete: ${normalized.length}/11 characters entered.`;
    } else if (normalized.length === 11) {
      const catChar = normalized.charAt(3);
      if (!['U', 'J', 'Z'].includes(catChar)) {
        hint = `4th letter must be category identifier 'U', 'J', or 'Z' (found '${catChar}').`;
      }
    }
    return {
      normalized,
      isFormatValid: false,
      isCheckDigitValid: false,
      isDuplicate: false,
      isVerified: false,
      message: hint,
      severity: 'error',
    };
  }

  // 4. Duplicate check within current trip
  if (existingNumbers && existingNumbers.length > 0) {
    const isDup = existingNumbers.some(
      (n) => n && normalize(n) === normalized
    );
    if (isDup) {
      return {
        normalized,
        isFormatValid: true,
        isCheckDigitValid: false,
        isDuplicate: true,
        isVerified: false,
        message: `Duplicate: Container ${normalized} is already added to this trip.`,
        severity: 'error',
      };
    }
  }

  // 5. Check digit calculation
  const expectedCheckDigit = calculateCheckDigit(normalized);
  const actualCheckDigit = parseInt(normalized.charAt(10), 10);
  const checkDigitOk = expectedCheckDigit === actualCheckDigit;
  const suggestion = suggestValidContainerNumber(normalized);

  if (!checkDigitOk) {
    return {
      normalized,
      isFormatValid: true,
      isCheckDigitValid: false,
      isDuplicate: false,
      isVerified: false,
      expectedCheckDigit,
      actualCheckDigit,
      suggestedNumber: suggestion || undefined,
      message: `Check digit mismatch (expected ${expectedCheckDigit}, got ${actualCheckDigit}). ${
        suggestion ? `Did you mean ${suggestion}?` : ''
      } Driver may confirm and save as Unverified.`,
      severity: 'warning',
    };
  }

  return {
    normalized,
    isFormatValid: true,
    isCheckDigitValid: true,
    isDuplicate: false,
    isVerified: true,
    expectedCheckDigit,
    actualCheckDigit,
    message: `Container ${normalized} verified ✓`,
    severity: 'ok',
  };
}

/**
 * Retrieves recently used container numbers from persistent storage.
 */
export async function getRecentContainerNumbers(): Promise<string[]> {
  try {
    const raw = await storage.getItem(RECENT_CONTAINERS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Saves a container number to recent history (keeps up to 10 most recent, deduplicated).
 */
export async function saveRecentContainerNumber(containerNumber: string): Promise<void> {
  const clean = normalize(containerNumber);
  if (!clean || clean.length < 10) return;
  try {
    const current = await getRecentContainerNumbers();
    const filtered = current.filter((item) => item !== clean);
    const updated = [clean, ...filtered].slice(0, 10);
    await storage.setItem(RECENT_CONTAINERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save recent container number:', e);
  }
}

