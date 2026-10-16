const ISO_CHAR_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export interface IsoValidationResult {
  valid: boolean;
  rawInput: string;
  normalizedNumber: string;
  ownerCode: string;       // First 3 letters
  categoryIdentifier: string; // 4th letter: U = freight, J = detachable, Z = trailer
  serialNumber: string;    // 6 digits
  actualCheckDigit: number; // 7th digit
  expectedCheckDigit: number;
  formatValid: boolean;
  checkDigitValid: boolean;
  message: string;
}

export function normalizeContainerNumber(raw: string): string {
  return (raw || '').replace(/[\s-]/g, '').toUpperCase().trim();
}

export function isValidIsoFormat(clean: string): boolean {
  return /^[A-Z]{4}\d{7}$/.test(clean);
}

export function computeCheckDigit(clean: string): number {
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
  return (sum % 11) % 10;
}

export function validateIsoContainer(raw: string): IsoValidationResult {
  const clean = normalizeContainerNumber(raw);
  
  if (!clean) {
    return {
      valid: false,
      rawInput: raw,
      normalizedNumber: '',
      ownerCode: '',
      categoryIdentifier: '',
      serialNumber: '',
      actualCheckDigit: -1,
      expectedCheckDigit: -1,
      formatValid: false,
      checkDigitValid: false,
      message: 'Container number cannot be blank',
    };
  }

  const formatValid = isValidIsoFormat(clean);
  if (!formatValid) {
    return {
      valid: false,
      rawInput: raw,
      normalizedNumber: clean,
      ownerCode: clean.slice(0, 3),
      categoryIdentifier: clean.length >= 4 ? clean[3] : '',
      serialNumber: clean.length > 4 ? clean.slice(4, 10) : '',
      actualCheckDigit: clean.length === 11 ? parseInt(clean[10], 10) : -1,
      expectedCheckDigit: -1,
      formatValid: false,
      checkDigitValid: false,
      message: 'Invalid ISO 6346 format. Must be 4 uppercase letters followed by 7 digits (e.g. MSCU7829103)',
    };
  }

  const expected = computeCheckDigit(clean);
  const actual = parseInt(clean.charAt(10), 10);
  const checkDigitValid = expected === actual;

  return {
    valid: checkDigitValid,
    rawInput: raw,
    normalizedNumber: clean,
    ownerCode: clean.slice(0, 3),
    categoryIdentifier: clean[3],
    serialNumber: clean.slice(4, 10),
    actualCheckDigit: actual,
    expectedCheckDigit: expected,
    formatValid: true,
    checkDigitValid,
    message: checkDigitValid
      ? `Valid ISO 6346 container number (Check digit ${actual} matches algorithm result).`
      : `Check digit mismatch: Provided '${actual}' but calculated check digit is '${expected}'.`,
  };
}
