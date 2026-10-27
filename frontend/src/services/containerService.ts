import apiClient from './api';

export interface ValidateContainerResult {
  valid: boolean;
  isoFormatValid: boolean;
  checkDigitValid: boolean;
  expectedCheckDigit: number;
  actualCheckDigit: number;
  duplicate: boolean;
  message: string;
  normalizedNumber?: string;
  existingTripNumber?: string;
  existingTerminal?: string;
  existingStatus?: string;
}

export interface AddManualContainerPayload {
  tripId?: string;
  containerNumber: string;
  size: '20FT' | '40FT';
  mainTerminal: 'CICT' | 'CWIT' | 'ECT' | 'JCT' | 'UCT' | 'SAGT';
  vesselName?: string;
  chaiNo?: string;
  destTerminal?: string;
}

const ISO_CHAR_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export function hasSymbols(raw: string): boolean {
  return /[^A-Za-z0-9]/.test((raw || '').trim());
}

export function normalizeContainerNumber(raw: string): string {
  return (raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
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

export function validateIsoClientSide(raw: string): ValidateContainerResult {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      isoFormatValid: false,
      checkDigitValid: false,
      expectedCheckDigit: -1,
      actualCheckDigit: -1,
      duplicate: false,
      message: 'Container number cannot be empty',
      normalizedNumber: '',
    };
  }

  // STEP 1: Check for symbols — if symbols entered, show clear error message requiring number
  if (hasSymbols(trimmed)) {
    return {
      valid: false,
      isoFormatValid: false,
      checkDigitValid: false,
      expectedCheckDigit: -1,
      actualCheckDigit: -1,
      duplicate: false,
      message: 'Symbols are not allowed. Please enter 7 numbers without symbols (e.g. MSCU7721892).',
      normalizedNumber: normalizeContainerNumber(trimmed),
    };
  }

  const clean = trimmed.toUpperCase();

  // STEP 2: Verify 4 uppercase English letters followed by 7 numeric digits (Total: 11 characters)
  const formatValid = isValidIsoFormat(clean);
  if (!formatValid) {
    let detail = 'Must be 4 uppercase English letters followed by 7 numbers (e.g. MSCU7721892).';
    if (clean.length < 11) {
      const letters = clean.slice(0, 4);
      const isPrefixLetters = /^[A-Z]*$/.test(letters);
      if (!isPrefixLetters) {
        detail = 'Prefix must be 4 uppercase English letters (e.g. MSCU).';
      } else if (clean.length < 4) {
        detail = `Enter 4 English letters first (${clean.length}/4 letters).`;
      } else {
        const digitsCount = clean.length - 4;
        detail = `Enter 7 numbers (${digitsCount}/7 digits entered).`;
      }
    } else if (clean.length > 11) {
      detail = `Container number exceeds 11 characters (${clean.length}/11).`;
    } else {
      const prefix = clean.slice(0, 4);
      const suffix = clean.slice(4);
      if (!/^[A-Z]{4}$/.test(prefix)) {
        detail = `Prefix "${prefix}" must contain exactly 4 uppercase English letters (A-Z).`;
      } else if (!/^\d{7}$/.test(suffix)) {
        detail = `Suffix "${suffix}" must contain exactly 7 numeric digits (0-9 without symbols).`;
      }
    }

    return {
      valid: false,
      isoFormatValid: false,
      checkDigitValid: false,
      expectedCheckDigit: -1,
      actualCheckDigit: -1,
      duplicate: false,
      message: `Format: ${detail}`,
      normalizedNumber: clean,
    };
  }

  // STEP 3: Verify if it is correct according to ISO 6346 Standard Check Digit (Modulus-11)
  const expected = computeCheckDigit(clean);
  const actual = parseInt(clean.charAt(10), 10);
  const checkDigitValid = expected === actual;

  if (!checkDigitValid) {
    return {
      valid: false,
      isoFormatValid: true,
      checkDigitValid: false,
      expectedCheckDigit: expected,
      actualCheckDigit: actual,
      duplicate: false,
      message: `Format Valid (4 English Letters + 7 Numbers). ISO Standard Check Digit Mismatch: Calculated is ${expected}, but container ends with ${actual}.`,
      normalizedNumber: clean,
    };
  }

  return {
    valid: true,
    isoFormatValid: true,
    checkDigitValid: true,
    expectedCheckDigit: expected,
    actualCheckDigit: actual,
    duplicate: false,
    message: `✓ ISO 6346 Standard Verified: ${clean} (4 English letters + 7 numbers, check digit ${actual} matches algorithm).`,
    normalizedNumber: clean,
  };
}

export const containerService = {
  async validateContainer(containerNumber: string, tripId?: string): Promise<ValidateContainerResult> {
    if (hasSymbols(containerNumber)) {
      return validateIsoClientSide(containerNumber);
    }
    try {
      const res = await apiClient.get<ValidateContainerResult>('/containers/validate', {
        params: { containerNumber: normalizeContainerNumber(containerNumber), tripId },
      });
      return res.data;
    } catch {
      // Fallback to client-side ISO validation
      return validateIsoClientSide(containerNumber);
    }
  },

  async addManualContainer(payload: AddManualContainerPayload): Promise<any> {
    const res = await apiClient.post('/containers', payload);
    return res.data;
  },

  async getContainers(tripId?: string, status?: string): Promise<any[]> {
    const res = await apiClient.get<any[]>('/containers', {
      params: { tripId, status },
    });
    return Array.isArray(res.data) ? res.data : [];
  },
};
