/**
 * SMART ITT — High Security Validator & Sanitization Engine
 * Enterprise Grade Password Complexity & Input Sanitization
 */

export interface PasswordRuleCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 - 100
  level: 'VERY_WEAK' | 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG';
  color: string;
  isValid: boolean;
  rules: PasswordRuleCheck[];
  feedback: string[];
}

// Common weak / default passwords to forbid in high-security mode
const FORBIDDEN_PASSWORDS = new Set([
  '123456',
  '12345678',
  'password',
  'password123',
  'qwerty',
  'driver',
  'supervisor',
  'admin',
  'admin123',
  'admin@123',
  'welcome',
  'letmein',
  'maritime',
  'colombo',
]);

export const securityValidator = {
  /**
   * Evaluates password against enterprise complexity policy:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 numeric digit
   * - At least 1 special symbol (!@#$%^&*...)
   * - Not in forbidden common password dictionary
   */
  evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const raw = password || '';
    const feedback: string[] = [];

    const hasMinLength = raw.length >= 8;
    const hasUpperCase = /[A-Z]/.test(raw);
    const hasLowerCase = /[a-z]/.test(raw);
    const hasNumber = /[0-9]/.test(raw);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~/\\`'"]/.test(raw);
    const isForbidden = FORBIDDEN_PASSWORDS.has(raw.trim().toLowerCase());

    const rules: PasswordRuleCheck[] = [
      { id: 'min_length', label: 'At least 8 characters', passed: hasMinLength },
      { id: 'upper_case', label: 'At least 1 uppercase letter (A-Z)', passed: hasUpperCase },
      { id: 'lower_case', label: 'At least 1 lowercase letter (a-z)', passed: hasLowerCase },
      { id: 'number', label: 'At least 1 numeric number (0-9)', passed: hasNumber },
      { id: 'special_char', label: 'At least 1 special character (!@#$%...)', passed: hasSpecialChar },
    ];

    if (!hasMinLength) feedback.push('Password must be at least 8 characters long.');
    if (!hasUpperCase) feedback.push('Include at least one uppercase letter (A-Z).');
    if (!hasLowerCase) feedback.push('Include at least one lowercase letter (a-z).');
    if (!hasNumber) feedback.push('Include at least one number (0-9).');
    if (!hasSpecialChar) feedback.push('Include at least one special character (!@#$%...).');
    if (isForbidden) feedback.push('This password is too common and easily guessed.');

    // Calculate score
    let passedCount = rules.filter((r) => r.passed).length;
    let score = passedCount * 20;

    // Extra length bonus
    if (raw.length >= 12 && passedCount === 5) {
      score = 100;
    } else if (raw.length >= 10 && passedCount >= 4) {
      score = Math.min(score + 10, 95);
    }

    if (isForbidden) {
      score = Math.min(score, 20);
    }

    let level: PasswordStrengthResult['level'] = 'VERY_WEAK';
    let color = '#ef4444'; // Red

    if (score >= 90) {
      level = 'STRONG';
      color = '#10b981'; // Green
    } else if (score >= 70) {
      level = 'GOOD';
      color = '#00e5ff'; // Cyan
    } else if (score >= 50) {
      level = 'FAIR';
      color = '#f59e0b'; // Amber
    } else if (score >= 30) {
      level = 'WEAK';
      color = '#f97316'; // Orange
    }

    const isValid = passedCount >= 4 && hasMinLength && !isForbidden;

    return {
      score,
      level,
      color,
      isValid,
      rules,
      feedback,
    };
  },

  /**
   * Sanitizes generic input strings against script injection and null bytes
   */
  sanitizeText(input: string, maxLength: number = 255): string {
    if (!input) return '';
    return input
      .replace(/\0/g, '') // remove null bytes
      .replace(/<[^>]*>?/gm, '') // strip HTML tags
      .replace(/javascript:/gi, '')
      .replace(/[^\x20-\x7E\s]/g, '') // strip non-printable ASCII
      .trim()
      .substring(0, maxLength);
  },

  /**
   * Sanitizes alphanumeric codes (Driver Code, Vehicle Number, Container Number)
   */
  sanitizeIdentifier(input: string, maxLength: number = 50): string {
    if (!input) return '';
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '')
      .substring(0, maxLength);
  },

  /**
   * Validates ISO 6346 Container Number Format (4 letters + 7 digits)
   */
  isValidContainerNumber(containerNo: string): boolean {
    if (!containerNo) return false;
    const clean = containerNo.trim().toUpperCase().replace(/[\s-]/g, '');
    return /^[A-Z]{4}\d{7}$/.test(clean);
  },
};
