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

export function validateIsoClientSide(raw: string): ValidateContainerResult {
  const clean = normalizeContainerNumber(raw);
  if (!clean) {
    return {
      valid: false,
      isoFormatValid: false,
      checkDigitValid: false,
      expectedCheckDigit: -1,
      actualCheckDigit: -1,
      duplicate: false,
      message: 'Container number cannot be empty',
      normalizedNumber: clean,
    };
  }

  const formatValid = isValidIsoFormat(clean);
  if (!formatValid) {
    return {
      valid: false,
      isoFormatValid: false,
      checkDigitValid: false,
      expectedCheckDigit: -1,
      actualCheckDigit: -1,
      duplicate: false,
      message: 'Format error: Must be 4 letters + 7 numbers (e.g. MSCU1234567).',
      normalizedNumber: clean,
    };
  }

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
      message: `ISO 6346 check digit mismatch: calculated check digit is ${expected}, but container ends with ${actual}.`,
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
    message: `Container ${clean} is ISO 6346 verified.`,
    normalizedNumber: clean,
  };
}

export const containerService = {
  async validateContainer(containerNumber: string, tripId?: string): Promise<ValidateContainerResult> {
    try {
      const res = await apiClient.get<ValidateContainerResult>('/containers/validate', {
        params: { containerNumber, tripId },
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
